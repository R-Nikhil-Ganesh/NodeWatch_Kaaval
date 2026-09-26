import React, { useState } from 'react';
import { Modal, Input, Select, Button } from '../ui/Primitives';
import { ApiError, createHearingRequest, HearingPayload, updateHearingRequest } from '../../services/api';
import { Hearing } from '../../types';

const PURPOSES: Hearing['purpose'][] = [
  'Appearance', 'Framing of Charge', 'Prosecution Evidence', 'Defence Evidence',
  'Cross-Examination', 'Final Arguments', 'For Orders', 'Judgment', 'Bail Hearing', 'Remand',
];

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');

const emptyForm = (court: string): HearingPayload => ({
  date: '', court, judge: '', purpose: 'Appearance', statement: '', nextHearingDate: undefined,
  attendance: { prosecutor: false, defenseCounsel: false, accusedPresent: false },
});

export const HearingFormModal = ({
  open,
  onClose,
  caseId,
  defaultCourt,
  editingHearing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  defaultCourt: string;
  editingHearing: Hearing | null;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<HearingPayload>(
    editingHearing
      ? { ...editingHearing }
      : emptyForm(defaultCourt)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever the modal is reopened for a different hearing
  // (or for a fresh "add" after a previous edit).
  React.useEffect(() => {
    if (open) setForm(editingHearing ? { ...editingHearing } : emptyForm(defaultCourt));
  }, [open, editingHearing, defaultCourt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.purpose) {
      setError('Hearing date and purpose are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingHearing) {
        await updateHearingRequest(caseId, editingHearing.hearingId, form);
      } else {
        await createHearingRequest(caseId, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the hearing record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editingHearing ? 'Edit Hearing' : 'Record New Hearing'} widthClass="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Hearing Date" type="date" value={toDateInput(form.date)}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required
          />
          <Select
            label="Purpose" value={form.purpose}
            onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value as Hearing['purpose'] }))}
          >
            {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input label="Court" value={form.court} onChange={(e) => setForm((f) => ({ ...f, court: e.target.value }))} />
          <Input label="Judge" value={form.judge} onChange={(e) => setForm((f) => ({ ...f, judge: e.target.value }))} />
          <Input
            label="Next Hearing Date (optional)" type="date" value={toDateInput(form.nextHearingDate)}
            onChange={(e) => setForm((f) => ({ ...f, nextHearingDate: e.target.value || undefined }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Judge's Statement / Order</label>
          <textarea
            value={form.statement}
            onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))}
            rows={3}
            className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          {([
            ['prosecutor', 'Prosecutor Present'],
            ['defenseCounsel', 'Defense Counsel Present'],
            ['accusedPresent', 'Accused Present'],
          ] as const).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.attendance[key]}
                onChange={(e) => setForm((f) => ({ ...f, attendance: { ...f.attendance, [key]: e.target.checked } }))}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : editingHearing ? 'Save Changes' : 'Record Hearing'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
