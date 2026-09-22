import { IOEvidence, MOCK_EVIDENCE } from './mockData';

export interface EvidenceStats {
  totalItems: number;
  atFSL: number;
  inTransit: number;
  integrityExceptions: number;
  pendingForensics: number;
}

export const getAllEvidence = (): IOEvidence[] => MOCK_EVIDENCE;

export const getEvidenceForCase = (firNumber: string): IOEvidence[] =>
  MOCK_EVIDENCE.filter(e => e.caseId === firNumber);

export const getEvidenceById = (evidenceId: string): IOEvidence | undefined =>
  MOCK_EVIDENCE.find(e => e.evidenceId === evidenceId);

export const getEvidenceStats = (): EvidenceStats => ({
  totalItems: MOCK_EVIDENCE.length,
  atFSL: MOCK_EVIDENCE.filter(e => e.status === 'At FSL').length,
  inTransit: MOCK_EVIDENCE.filter(e => e.status === 'In Transit').length,
  integrityExceptions: MOCK_EVIDENCE.filter(e => e.integrityStatus === 'Compromised').length,
  pendingForensics: MOCK_EVIDENCE.filter(e =>
    e.forensicStatus === 'Pending Submission' || e.forensicStatus === 'In Transit'
  ).length,
});

export const searchEvidence = (query: string, filters: {
  type?: string;
  status?: string;
  location?: string;
  custodian?: string;
  forensicStatus?: string;
  integrityStatus?: string;
  caseId?: string;
}): IOEvidence[] => {
  const q = query.toLowerCase();
  return MOCK_EVIDENCE.filter(e => {
    const matchesQuery = !q ||
      e.evidenceId.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.currentCustodian.toLowerCase().includes(q);
    const matchesType = !filters.type || filters.type === 'All' || e.type === filters.type;
    const matchesStatus = !filters.status || filters.status === 'All' || e.status === filters.status;
    const matchesLocation = !filters.location || filters.location === 'All' || e.currentLocation.includes(filters.location);
    const matchesCustodian = !filters.custodian || filters.custodian === 'All' || e.currentCustodian.includes(filters.custodian);
    const matchesForensic = !filters.forensicStatus || filters.forensicStatus === 'All' || e.forensicStatus === filters.forensicStatus;
    const matchesIntegrity = !filters.integrityStatus || filters.integrityStatus === 'All' || e.integrityStatus === filters.integrityStatus;
    const matchesCase = !filters.caseId || e.caseId === filters.caseId;
    return matchesQuery && matchesType && matchesStatus && matchesLocation && matchesCustodian && matchesForensic && matchesIntegrity && matchesCase;
  });
};
