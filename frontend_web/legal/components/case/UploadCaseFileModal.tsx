import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Modal, Input, Select, Button } from '../ui/Primitives';
import { ApiError, uploadCaseFileRequest } from '../../services/api';
import { CaseFile, CaseFileType } from '../../types';

const FILE_TYPES: CaseFileType[] = [
  'FIR', 'Consent Form / Panchnama', 'Section 63 BSA Certificate', 'Arrest Warrant',
  'Search Warrant', 'Production Warrant', 'Request Form', 'Chargesheet',
  'Court Order', 'Bail Order', 'Medical / Post-mortem Report',
];

const MAX_FILE_MB = 200;

export const UploadCaseFileModal = ({
  open,
  onClose,
  caseId,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  onUploaded: (file: CaseFile) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CaseFileType>('FIR');
  const [summary, setSummary] = useState('');
  const [sections, setSections] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setTitle('');
    setType('FIR');
    setSummary('');
    setSections('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    if (picked && picked.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File exceeds the ${MAX_FILE_MB}MB limit.`);
      return;
    }
    setError(null);
    setFile(picked);
    if (picked && !title) setTitle(picked.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Select a file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadCaseFileRequest(caseId, file, {
        title,
        docTypeLabel: type,
        description: summary,
        relatedSections: sections.split(',').map((s) => s.trim()).filter(Boolean),
      });
      onUploaded(uploaded);
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload the file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Upload Case File" widthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-status-urgent">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">File</label>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line-300 rounded-sm py-6 cursor-pointer hover:border-navy-500 transition-colors">
            <UploadCloud size={22} className="text-ink-400" />
            <span className="text-sm text-ink-600">{file ? file.name : 'Click to choose a file (PDF, image, DOCX…)'}</span>
            {file && <span className="text-xs text-ink-400">{(file.size / 1024).toFixed(0)} KB</span>}
            <input type="file" className="hidden" onChange={handleFilePick} />
          </label>
        </div>

        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Select label="Document Type" value={type} onChange={(e) => setType(e.target.value as CaseFileType)}>
          {FILE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
          />
        </div>
        <Input
          label="Related Provisions (comma-separated)"
          value={sections}
          onChange={(e) => setSections(e.target.value)}
          placeholder="BNS 303(2), BNS 331(3)"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={uploading || !file}>
            {uploading ? 'Uploading…' : 'Upload File'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
