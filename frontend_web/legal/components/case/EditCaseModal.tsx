import React, { useState } from 'react';
import { Modal, Input, Select, Button } from '../ui/Primitives';
import { ApiError, CaseUpdatePayload, updateCaseRequest } from '../../services/api';
import { CASE_STAGE_LABEL, CaseOutcome, CaseStage, CourtCase } from '../../types';

export const EditCaseModal = ({
  open,
  onClose,
  courtCase,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  courtCase: CourtCase;
  onUpdated: () => void;
}) => {
  const [form, setForm] = useState<CaseUpdatePayload>({
    stage: courtCase.stage,
    outcome: courtCase.outcome,
    court: courtCase.court,
    presidingJudge: courtCase.presidingJudge,
    publicProsecutor: courtCase.publicProsecutor,
    defenseCounsel: courtCase.defenseCounsel,
    investigatingOfficer: courtCase.investigatingOfficer,
    investigatingOfficerDesignation: courtCase.investigatingOfficerDesignation,
    description: courtCase.description,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof CaseUpdatePayload) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value } as CaseUpdatePayload));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateCaseRequest(courtCase.caseId, form);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the case. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Case Details" widthClass="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Case Stage" value={form.stage} onChange={set('stage')}>
            {Object.values(CaseStage).map((s) => <option key={s} value={s}>{CASE_STAGE_LABEL[s]}</option>)}
          </Select>
          <Select label="Outcome" value={form.outcome} onChange={set('outcome')}>
            {Object.values(CaseOutcome).map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
          <Input label="Court" value={form.court} onChange={set('court')} />
          <Input label="Presiding Judge" value={form.presidingJudge} onChange={set('presidingJudge')} />
          <Input label="Public Prosecutor" value={form.publicProsecutor} onChange={set('publicProsecutor')} />
          <Input label="Defense Counsel" value={form.defenseCounsel} onChange={set('defenseCounsel')} />
          <Input label="Investigating Officer" value={form.investigatingOfficer} onChange={set('investigatingOfficer')} />
          <Input label="IO Designation" value={form.investigatingOfficerDesignation} onChange={set('investigatingOfficerDesignation')} />
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
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
