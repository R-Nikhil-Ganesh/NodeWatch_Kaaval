import type { CustodyEvent } from './types';
export type { CustodyEvent };

const MOCK_CUSTODY_EVENTS: CustodyEvent[] = [
  {
    id: 'CE-001',
    evidenceId: 'EV-0142',
    timestamp: '2026-09-02T18:32:00.000Z',
    eventType: 'Evidence Collected',
    actor: 'SI Arun Kumar',
    location: 'Crime Scene A, Koramangala',
    txId: 'TX-8F21A001',
    blockchainVerified: true,
    notes: 'Collected from bedroom table'
  },
  {
    id: 'CE-002',
    evidenceId: 'EV-0142',
    timestamp: '2026-09-02T18:45:00.000Z',
    eventType: 'Evidence Sealed',
    actor: 'SI Arun Kumar',
    location: 'Crime Scene A, Koramangala',
    txId: 'TX-8F21A002',
    blockchainVerified: true,
    sealId: 'SEAL-9821'
  },
  {
    id: 'CE-003',
    evidenceId: 'EV-0142',
    timestamp: '2026-09-02T19:20:00.000Z',
    eventType: 'Custody Transferred',
    actor: 'SI Arun Kumar',
    fromCustodian: 'SI Arun Kumar',
    toCustodian: 'Constable Ravi M',
    location: 'Koramangala Police Station',
    txId: 'TX-8F21A003',
    blockchainVerified: true,
    notes: 'Transfer for transport to station evidence room'
  },
  {
    id: 'CE-004',
    evidenceId: 'EV-0142',
    timestamp: '2026-09-02T20:10:00.000Z',
    eventType: 'Custody Received',
    actor: 'Constable Ravi M',
    fromCustodian: 'Constable Ravi M',
    toCustodian: 'Mallikarjuna PS Evidence Room',
    location: 'Central Police Station — Evidence Room',
    txId: 'TX-8F21A004',
    blockchainVerified: true
  },
  {
    id: 'CE-005',
    evidenceId: 'EV-0142',
    timestamp: '2026-09-04T10:00:00.000Z',
    eventType: 'Transferred to FSL',
    actor: 'Head Constable Venkatesh',
    fromCustodian: 'Mallikarjuna PS Evidence Room',
    toCustodian: 'CARO FSL Bangalore — Transit',
    location: 'Central Police Station — Evidence Room',
    txId: 'TX-8F21A005',
    blockchainVerified: true,
    notes: 'Sent via official vehicle with escort'
  },
  {
    id: 'CE-006',
    evidenceId: 'EV-0142',
    timestamp: '2026-09-04T14:30:00.000Z',
    eventType: 'Received by FSL',
    actor: 'Dr. Suresh Kumar (FSL)',
    fromCustodian: 'CARO FSL Bangalore — Transit',
    toCustodian: 'CARO FSL Bangalore — Digital Forensics Unit',
    location: 'CARO FSL Bangalore',
    txId: 'TX-8F21A006',
    blockchainVerified: true
  },
  {
    id: 'CE-007',
    evidenceId: 'EV-0142',
    timestamp: '2026-09-05T09:00:00.000Z',
    eventType: 'Forensic Examination Started',
    actor: 'Dr. Suresh Kumar (FSL)',
    location: 'CARO FSL Bangalore — Digital Forensics Unit',
    txId: 'TX-8F21A007',
    blockchainVerified: true
  },
  {
    id: 'CE-008',
    evidenceId: 'EV-0142',
    timestamp: '2026-09-10T16:00:00.000Z',
    eventType: 'Forensic Report Filed',
    actor: 'Dr. Suresh Kumar (FSL)',
    location: 'CARO FSL Bangalore',
    txId: 'TX-8F21A008',
    blockchainVerified: true,
    notes: 'Report submitted to investigating officer'
  }
];

export interface ChainIntegrityReport {
  evidenceId: string;
  totalEvents: number;
  verified: boolean;
  noMissingEvents: boolean;
  allTransfersAcknowledged: boolean;
  issues: string[];
}

export async function getCustodyTimeline(evidenceId: string): Promise<CustodyEvent[]> {
  await new Promise(r => setTimeout(r, 300));
  return MOCK_CUSTODY_EVENTS.filter(e => e.evidenceId === evidenceId);
}

export async function getChainIntegrityReport(evidenceId: string): Promise<ChainIntegrityReport> {
  await new Promise(r => setTimeout(r, 200));
  return {
    evidenceId,
    totalEvents: MOCK_CUSTODY_EVENTS.filter(e => e.evidenceId === evidenceId).length,
    verified: true,
    noMissingEvents: true,
    allTransfersAcknowledged: true,
    issues: []
  };
}
