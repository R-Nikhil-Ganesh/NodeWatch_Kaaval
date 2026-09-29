import React, { useEffect, useState } from 'react';
import { Modal, Input, Select, Button } from '../ui/Primitives';
import { ApiError, createCaseRequest, fetchCases, NewCasePayload } from '../../services/api';
import { CaseType, CourtCase } from '../../types';

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

// Multi-select list of existing cases used to source an Immediate case's
// details/evidence/files. Selection order matters — the first case picked
// is the "primary" source whose field values win when merging.
const SourceCasePicker = ({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCases()
      .then(setCases)
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cases.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.title.toLowerCase().includes(q) || c.cnrNumber.toLowerCase().includes(q) || c.caseId.toLowerCase().includes(q);
  });

  const toggle = (caseId: string) => {
    if (selectedIds.includes(caseId)) {
      onChange(selectedIds.filter((id) => id !== caseId));
    } else {
      onChange([...selectedIds, caseId]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1.5">Source Case(s)</label>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by title, CNR, or case ID…"
        className="w-full px-3.5 py-2.5 border border-line-300 rounded-sm bg-white text-ink-900 placeholder:text-ink-300 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors mb-2"
      />
      <div className="border border-line-300 rounded-sm max-h-56 overflow-y-auto divide-y divide-line-200">
        {loading && <p className="text-sm text-ink-500 px-3.5 py-2.5">Loading cases…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-ink-500 px-3.5 py-2.5">No matching cases found.</p>
        )}
        {filtered.map((c) => {
          const selected = selectedIds.includes(c.caseId);
          const isPrimary = selectedIds[0] === c.caseId;
          return (
            <label key={c.caseId} className="flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-paper-100 cursor-pointer">
              <input type="checkbox" checked={selected} onChange={() => toggle(c.caseId)} />
              <span className="flex-1 min-w-0">
                <span className="block text-ink-900 truncate">{c.title}</span>
                <span className="block text-xs text-ink-500 truncate">{c.caseId} · {c.cnrNumber}</span>
              </span>
              {isPrimary && (
                <span className="text-xs font-medium text-saffron-700 bg-saffron-50 border border-saffron-200 rounded-full px-2 py-0.5 shrink-0">
                  Primary
                </span>
              )}
            </label>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-ink-500">
        The first case you select is the primary source — its details win when merging.
      </p>
    </div>
  );
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
  const [isImmediate, setIsImmediate] = useState(false);
  const [sourceCaseIds, setSourceCaseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof NewCasePayload) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value } as NewCasePayload));

  const reset = () => {
    setForm(EMPTY);
    setIsImmediate(false);
    setSourceCaseIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.cnrNumber.trim()) {
      setError('Case title and CNR number are required.');
      return;
    }
    if (isImmediate && sourceCaseIds.length === 0) {
      setError('Select at least one source case to port details from.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: NewCasePayload = isImmediate
        ? { title: form.title, cnrNumber: form.cnrNumber, isImmediate: true, sourceCaseIds }
        : form;
      await createCaseRequest(payload);
      reset();
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

        <label className="flex items-start gap-3 p-3 border border-line-300 rounded-sm bg-paper-50 cursor-pointer">
          <input
            type="checkbox"
            checked={isImmediate}
            onChange={(e) => setIsImmediate(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-ink-900">Immediate Case</span>
            <span className="block text-xs text-ink-500 mt-0.5">
              Only title and CNR number are required. Pick existing case(s) to port the rest of the
              details, case files, evidence, and audit history from.
            </span>
          </span>
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Case Title" value={form.title} onChange={set('title')} placeholder="State vs. …" required />
          <Input label="CNR Number" value={form.cnrNumber} onChange={set('cnrNumber')} placeholder="TNCH01-000123-2024" required />
        </div>

        {isImmediate ? (
          <SourceCasePicker selectedIds={sourceCaseIds} onChange={setSourceCaseIds} />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
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
          </>
        )}

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
