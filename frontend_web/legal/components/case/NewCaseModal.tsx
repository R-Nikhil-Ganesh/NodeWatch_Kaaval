import React, { useState } from 'react';
import { Modal, Input, Select, Button } from '../ui/Primitives';
import { ApiError, createCaseRequest, NewCasePayload } from '../../services/api';
import { CaseType } from '../../types';

const CASE_TYPES: CaseType[] = [
  'Theft', 'Robbery', 'Murder', 'Cyber Crime', 'Narcotics (NDPS)',
  'Cheating & Criminal Breach of Trust', 'Assault & Hurt', 'Kidnapping',
  'Counterfeit Currency', 'Sexual Assault (POCSO)',
];

const EMPTY: NewCasePayload = {
  title: '', cnrNumber: '', firNumber: '', policeStation: '', district: '', state: '',
  caseType: 'Theft', court: '', presidingJudge: '', publicProsecutor: '', defenseCounsel: '',
  description: '',
};

export const NewCaseModal = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [form, setForm] = useState<NewCasePayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof NewCasePayload) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value } as NewCasePayload));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.cnrNumber.trim()) {
      setError('Case title and CNR number are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCaseRequest(form);
      setForm(EMPTY);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not register the case. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Register New Case" widthClass="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Case Title" value={form.title} onChange={set('title')} placeholder="State vs. …" required />
          <Input label="CNR Number" value={form.cnrNumber} onChange={set('cnrNumber')} placeholder="TNCH01-000123-2024" required />
          <Input label="FIR Number" value={form.firNumber} onChange={set('firNumber')} />
          <Select label="Case Type" value={form.caseType} onChange={set('caseType')}>
            {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Police Station" value={form.policeStation} onChange={set('policeStation')} />
          <Input label="District" value={form.district} onChange={set('district')} />
          <Input label="State" value={form.state} onChange={set('state')} />
          <Input label="Court" value={form.court} onChange={set('court')} />
          <Input label="Presiding Judge" value={form.presidingJudge} onChange={set('presidingJudge')} />
          <Input label="Public Prosecutor" value={form.publicProsecutor} onChange={set('publicProsecutor')} />
          <Input label="Defense Counsel" value={form.defenseCounsel} onChange={set('defenseCounsel')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Case Summary</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Registering…' : 'Register Case'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
