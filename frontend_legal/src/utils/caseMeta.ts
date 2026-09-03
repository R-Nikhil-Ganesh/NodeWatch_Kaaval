import { CaseOutcome, CaseStage, CaseType, IntegrityStatus } from '../types';

export const stageTone = (stage: CaseStage): 'pending' | 'resolved' | 'urgent' | 'navy' => {
  if (stage === CaseStage.DISPOSED) return 'resolved';
  if (stage === CaseStage.FINAL_ARGUMENTS || stage === CaseStage.JUDGMENT_RESERVED) return 'urgent';
  return 'pending';
};

export const outcomeLabel = (outcome: CaseOutcome): string => {
  switch (outcome) {
    case CaseOutcome.CONVICTED: return 'Convicted';
    case CaseOutcome.ACQUITTED: return 'Acquitted';
    case CaseOutcome.SETTLED: return 'Settled';
    default: return '—';
  }
};

export const outcomeTone = (outcome: CaseOutcome): 'resolved' | 'urgent' | 'navy' | 'neutral' => {
  switch (outcome) {
    case CaseOutcome.CONVICTED: return 'urgent';
    case CaseOutcome.ACQUITTED: return 'resolved';
    case CaseOutcome.SETTLED: return 'navy';
    default: return 'neutral';
  }
};

export const integrityTone = (status: IntegrityStatus): 'resolved' | 'urgent' | 'pending' => {
  if (status === 'VERIFIED') return 'resolved';
  if (status === 'COMPROMISED') return 'urgent';
  return 'pending';
};

export const CASE_TYPE_COLORS: Record<CaseType, string> = {
  'Theft': 'bg-navy-50 text-navy-800',
  'Robbery': 'bg-saffron-50 text-saffron-700',
  'Murder': 'bg-status-urgentBg text-status-urgent',
  'Cyber Crime': 'bg-navy-50 text-navy-800',
  'Narcotics (NDPS)': 'bg-status-pendingBg text-status-pending',
  'Cheating & Criminal Breach of Trust': 'bg-saffron-50 text-saffron-700',
  'Assault & Hurt': 'bg-status-pendingBg text-status-pending',
  'Kidnapping': 'bg-status-urgentBg text-status-urgent',
  'Counterfeit Currency': 'bg-navy-50 text-navy-800',
  'Sexual Assault (POCSO)': 'bg-status-urgentBg text-status-urgent',
};
