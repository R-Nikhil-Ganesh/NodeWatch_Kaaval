import React, { useState } from 'react';
import { Modal, Input, Select, Button } from '../ui/Primitives';
import { ApiError, updateCaseFileRequest } from '../../services/api';
import { CaseFile, CaseFileType } from '../../types';

const FILE_TYPES: CaseFileType[] = [
  'FIR', 'Consent Form / Panchnama', 'Section 63 BSA Certificate', 'Arrest Warrant',
  'Search Warrant', 'Production Warrant', 'Request Form', 'Chargesheet',
  'Court Order', 'Bail Order', 'Medical / Post-mortem Report',
];

export const EditCaseFileModal = ({
  open,
  onClose,
  file,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  file: CaseFile;
  onSaved: (updated: CaseFile) => void;
}) => {
  const [title, setTitle] = useState(file.title);
  const [type, setType] = useState<CaseFileType>(file.type);
  const [summary, setSummary] = useState(file.summary);
  const [sections, setSections] = useState((file.relatedSections || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCaseFileRequest(file.fileId, {
        title,
        docTypeLabel: type,
        description: summary,
        relatedSections: sections.split(',').map((s) => s.trim()).filter(Boolean),
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Document" widthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-status-urgent">{error}</p>}
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
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
