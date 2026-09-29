import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { createCanvas } from '@napi-rs/canvas';

const execFileAsync = promisify(execFile);

export const thumbnailService = {
  /**
   * Extract the frame at ~1s into a video as a JPEG buffer, so mobile (which
   * has no video-rendering library) can show a real first-frame preview
   * instead of a generic icon.
   */
  async fromVideo(buffer) {
    const tmpBase = path.join(os.tmpdir(), crypto.randomUUID());
    const inPath = `${tmpBase}.mp4`;
    const outPath = `${tmpBase}.jpg`;
    await fs.writeFile(inPath, buffer);
    try {
      await execFileAsync(ffmpeg.path, [
        '-y', '-i', inPath,
        '-ss', '00:00:01',
        '-frames:v', '1',
        '-vf', 'scale=480:-1',
        '-f', 'image2',
        outPath,
      ]);
      return await fs.readFile(outPath);
    } finally {
      await fs.unlink(inPath).catch(() => {});
      await fs.unlink(outPath).catch(() => {});
    }
  },

  /**
   * Render page 1 of a PDF to a JPEG buffer.
   */
  async fromPdf(buffer) {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      isEvalSupported: false,
      standardFontDataUrl: new URL('../../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href,
    });
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toBuffer('image/jpeg');
  },
};
