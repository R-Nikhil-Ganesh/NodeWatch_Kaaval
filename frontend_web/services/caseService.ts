import { IOCase, MOCK_CASES } from './mockData';

export interface CaseStats {
  activeCases: number;
  underInvestigation: number;
  awaitingForensics: number;
  chargeSheetPrep: number;
  closed: number;
}

export const getCases = (): IOCase[] => {
  return MOCK_CASES;
};

export const getCaseById = (firNumber: string): IOCase | undefined => {
  return MOCK_CASES.find(c => c.firNumber === firNumber);
};

export const getCaseStats = (): CaseStats => {
  return {
    activeCases: MOCK_CASES.filter(c => c.status !== 'Closed').length,
    underInvestigation: MOCK_CASES.filter(c => c.status === 'Under Investigation').length,
    awaitingForensics: MOCK_CASES.filter(c => c.status === 'Awaiting Forensics').length,
    chargeSheetPrep: MOCK_CASES.filter(c => c.status === 'Charge Sheet Preparation').length,
    closed: MOCK_CASES.filter(c => c.status === 'Closed').length,
  };
};

export const searchCases = (
  queryOrOptions?: string | { query?: string; status?: string },
  statusFilter: string = 'All'
): IOCase[] => {
  let q = '';
  let status = statusFilter;

  if (typeof queryOrOptions === 'object' && queryOrOptions !== null) {
    q = (queryOrOptions.query || '').toLowerCase().trim();
    if (queryOrOptions.status) {
      status = queryOrOptions.status;
    }
  } else if (typeof queryOrOptions === 'string') {
    q = queryOrOptions.toLowerCase().trim();
  }

  return MOCK_CASES.filter(c => {
    const matchesQuery = !q ||
      c.firNumber.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.investigatingOfficer.toLowerCase().includes(q) ||
      c.policeStation.toLowerCase().includes(q);
    const matchesStatus = status === 'All' || !status || c.status === status;
    return matchesQuery && matchesStatus;
  });
};
