import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

// Postgres tsvector indexing has diminishing returns past a few pages of
// text and no interest in indexing megabytes of scanned-report filler, so
// extracted content is capped well below the 200MB upload limit.
const MAX_CONTENT_CHARS = 200_000;

const EXTRACTORS = {
  '.pdf': async (buffer) => {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  },
  '.docx': async (buffer) => {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  },
  '.txt': async (buffer) => buffer.toString('utf8'),
};

export const textExtractionService = {
  /**
   * Best-effort plain-text extraction for full-text search indexing.
   * Unsupported formats (images, legacy .doc, etc.) and parse failures
   * resolve to null rather than blocking the upload — extraction is an
   * indexing nicety, not a requirement for filing a document.
   */
  async extractText(buffer, ext) {
    const extractor = EXTRACTORS[(ext || '').toLowerCase()];
    if (!extractor) return null;

    try {
      const text = await extractor(buffer);
      const normalized = text?.replace(/\s+/g, ' ').trim();
      if (!normalized) return null;
      return normalized.slice(0, MAX_CONTENT_CHARS);
    } catch (err) {
      console.error('[Text Extraction Error]', err);
      return null;
    }
  },
};
