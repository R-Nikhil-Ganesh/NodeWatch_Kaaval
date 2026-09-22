import { ForensicRecord, MOCK_FORENSIC_RECORDS } from './mockData';

export interface ForensicSummary {
  pendingSubmission: number;
  inTransit: number;
  receivedByFSL: number;
  underExamination: number;
  examinationComplete: number;
  reportAvailable: number;
  notRequired: number;
}

export const getForensicStatus = (evidenceId: string): ForensicRecord | undefined =>
  MOCK_FORENSIC_RECORDS.find(r => r.evidenceId === evidenceId);

export const getForensicRecordsForCase = (caseId: string): ForensicRecord[] =>
  MOCK_FORENSIC_RECORDS.filter(r => r.caseId === caseId);

export const getAllForensicRecords = (): ForensicRecord[] => MOCK_FORENSIC_RECORDS;

export const getForensicSummary = (caseId?: string): ForensicSummary => {
  const records = caseId
    ? MOCK_FORENSIC_RECORDS.filter(r => r.caseId === caseId)
    : MOCK_FORENSIC_RECORDS;
  return {
    pendingSubmission: records.filter(r => r.examinationStatus === 'Pending Submission').length,
    inTransit: records.filter(r => r.examinationStatus === 'In Transit').length,
    receivedByFSL: records.filter(r => r.examinationStatus === 'Received by FSL').length,
    underExamination: records.filter(r => r.examinationStatus === 'Under Examination').length,
    examinationComplete: records.filter(r => r.examinationStatus === 'Examination Complete').length,
    reportAvailable: records.filter(r => r.examinationStatus === 'Report Available').length,
    notRequired: 0,
  };
};
