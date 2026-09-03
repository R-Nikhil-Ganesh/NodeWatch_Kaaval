import {
  AuditAction,
  AuditLogEntry,
  CaseFile,
  CaseFileType,
  CaseOutcome,
  CaseParty,
  CaseStage,
  CaseType,
  CourtCase,
  CustodyEvent,
  EvidenceItem,
  Hearing,
  LegalDesignation,
  LegalUser,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const TOKEN_KEY = 'cms_session_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem(TOKEN_KEY) ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError('Unable to reach the server. Please check your connection and try again.', 0);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      /* non-JSON error body — keep default message */
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const setAuthToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

const mapUser = (u: any): LegalUser => ({
  id: u.user_id || u.id,
  name: u.name,
  email: u.email,
  designation: (u.designation as LegalDesignation) || LegalDesignation.REGISTRAR,
  barOrJudicialId: u.bar_judicial_id || '—',
  court: u.court || '—',
  jurisdiction: u.jurisdiction || '—',
  phone: u.phone || '—',
  profileImage: u.profile_image_url || undefined,
});

export async function loginRequest(email: string, password: string): Promise<{ user: LegalUser; token: string }> {
  const data = await request<{ user: any; token: string }>('/api/legal/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { user: mapUser(data.user), token: data.token };
}

export async function logoutRequest(userId: string): Promise<void> {
  try {
    await request('/api/legal/auth/logout', { method: 'POST', body: JSON.stringify({ userId }) });
  } catch {
    /* best-effort — logging out client-side must never be blocked by this */
  }
}

// ---------------------------------------------------------------------------
// Custody trail synthesis
// Neither case_documents nor evidence carry a per-item custody-event log in
// the current schema (only case-level and evidence-level *transfer* tables
// do, and those aren't populated by the read-only legal frontend). Until
// that's modelled, we synthesise a single accurate "filed / collected" event
// from the row's own uploader + timestamp so the UI never renders empty.
// ---------------------------------------------------------------------------
const singleCustodyEvent = (
  action: CustodyEvent['action'],
  timestamp: string,
  fromCustodian: string,
  fromRole: string,
  toCustodian: string,
  toRole: string
): CustodyEvent[] => [
  { eventId: `${timestamp}-1`, timestamp, fromCustodian, fromRole, toCustodian, toRole, action },
];

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

const mapParty = (p: any): CaseParty => ({
  role: p.role,
  name: p.name,
  age: p.age ?? undefined,
  address: p.address ?? undefined,
  custodyStatus: p.custodyStatus ?? undefined,
});

const mapCase = (row: any): CourtCase => ({
  caseId: row.caseId,
  cnrNumber: row.cnrNumber,
  firNumber: row.firNumber,
  firDate: row.firDate,
  policeStation: row.policeStation,
  district: row.district,
  state: row.state,
  title: row.title,
  caseType: row.caseType as CaseType,
  sections: row.sections || [],
  description: row.description,
  court: row.court,
  presidingJudge: row.presidingJudge,
  publicProsecutor: row.publicProsecutor,
  defenseCounsel: row.defenseCounsel,
  investigatingOfficer: row.investigatingOfficer,
  investigatingOfficerDesignation: row.investigatingOfficerDesignation,
  parties: (row.parties || []).map(mapParty),
  stage: row.stage as CaseStage,
  outcome: (row.outcome as CaseOutcome) || CaseOutcome.NONE,
  registeredAt: row.registeredAt,
  firstHearingDate: row.firstHearingDate ?? undefined,
  lastHearingDate: row.lastHearingDate ?? undefined,
  upcomingHearingDate: row.upcomingHearingDate ?? undefined,
  disposedAt: row.disposedAt ?? undefined,
  currentCustodian: row.currentCustodian || '—',
});

export async function fetchCases(): Promise<CourtCase[]> {
  const rows = await request<any[]>('/api/legal/cases');
  return rows.map(mapCase);
}

export async function fetchCase(caseId: string): Promise<CourtCase> {
  const row = await request<any>(`/api/legal/cases/${caseId}`);
  return mapCase(row);
}

export async function recordCaseView(caseId: string, actorId: string, actorRole: string): Promise<void> {
  try {
    await request(`/api/legal/cases/${caseId}/view`, {
      method: 'POST',
      body: JSON.stringify({ actorId, actorRole }),
    });
  } catch {
    /* best-effort audit ping — never blocks the page */
  }
}

// ---------------------------------------------------------------------------
// Hearings
// ---------------------------------------------------------------------------

const mapHearing = (row: any): Hearing => ({
  hearingId: row.hearingId,
  caseId: row.caseId,
  date: row.date,
  court: row.court,
  judge: row.judge,
  purpose: row.purpose,
  statement: row.statement,
  nextHearingDate: row.nextHearingDate ?? undefined,
  attendance: {
    prosecutor: !!row.attendance?.prosecutor,
    defenseCounsel: !!row.attendance?.defenseCounsel,
    accusedPresent: !!row.attendance?.accusedPresent,
  },
});

export async function fetchHearings(caseId: string): Promise<Hearing[]> {
  const rows = await request<any[]>(`/api/legal/cases/${caseId}/hearings`);
  return rows.map(mapHearing);
}

// ---------------------------------------------------------------------------
// Case Files (documents)
// ---------------------------------------------------------------------------

const mapCaseFile = (row: any): CaseFile => {
  const uploadedBy = row.uploaded_by_name || 'Unknown';
  const uploadedByRole = row.uploaded_by_role || '';
  return {
    fileId: row.document_id,
    caseId: row.case_id,
    type: (row.doc_type_label as CaseFileType) || 'Request Form',
    title: row.title,
    fileFormat: (row.file_format as CaseFile['fileFormat']) || 'PDF',
    fileSizeKb: row.file_size_kb || 0,
    uploadedBy,
    uploadedByRole,
    uploadedAt: row.created_at,
    relatedSections: row.related_sections || [],
    linkedEvidenceIds: row.linked_evidence_ids || [],
    custodyTrail: singleCustodyEvent('Filed in Court', row.created_at, uploadedBy, uploadedByRole, 'Court Registry', 'Court Registry'),
    summary: row.description || '',
  };
};

export async function fetchCaseFiles(caseId: string): Promise<CaseFile[]> {
  const rows = await request<any[]>(`/api/legal/documents?caseId=${encodeURIComponent(caseId)}`);
  return rows.map(mapCaseFile);
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

const DIGITAL_FILE_TYPE_MAP: Record<string, string> = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  PDF: 'DOCUMENT',
  WORD: 'DOCUMENT',
  DISK_IMAGE: 'DISK_IMAGE',
};

const mapEvidence = (row: any): EvidenceItem => {
  const evidenceId = row.evidenceId || row.evidence_id;
  const caseId = row.caseId || row.case_id;
  const collectedBy = row.uploaded_by_name || 'Unknown';
  const collectedByDesignation = row.uploaded_by_designation || '';
  const collectedAt = row.collected_timestamp || row.created_at;
  const currentCustodian = row.current_custodian_name || row.custodian_display_name || '—';
  const trail = singleCustodyEvent('Collected', collectedAt, collectedBy, collectedByDesignation, currentCustodian, 'Custodian');

  if (row.type === 'PHYSICAL') {
    return {
      kind: 'PHYSICAL',
      evidenceId,
      caseId,
      name: row.name,
      category: (row.category as any) || 'Other',
      description: row.notes || '',
      collectedBy,
      collectedByDesignation,
      collectedAt,
      storageLocation: row.collected_location || '—',
      currentCustodian,
      sealNumber: row.seal_number || '—',
      custodyTrail: trail,
    };
  }

  const fileSizeBytes = row.file_size_bytes ? Number(row.file_size_bytes) : 0;
  return {
    kind: 'DIGITAL',
    evidenceId,
    caseId,
    fileName: row.fileName || row.file_name,
    fileType: (DIGITAL_FILE_TYPE_MAP[row.type] as any) || 'DOCUMENT',
    description: row.notes || '',
    collectedBy,
    collectedByDesignation,
    collectedAt,
    classification: row.classification,
    sha256Hash: row.fileHash || row.file_hash || '',
    ledgerTxId: row.blockchainTxId || row.blockchain_tx_id || 'Pending anchor',
    ledgerBlockRef: row.ledger_block_ref || 'Pending anchor',
    integrityStatus: row.integrityStatus || row.integrity_status || 'PENDING',
    lastVerifiedAt: row.last_verified_at ?? undefined,
    section63CertificateId: row.section63Certificate ?? undefined,
    fileSizeMb: fileSizeBytes ? Number((fileSizeBytes / (1024 * 1024)).toFixed(1)) : 0,
    custodyTrail: trail,
  };
};

export async function fetchEvidence(caseId: string): Promise<EvidenceItem[]> {
  const rows = await request<any[]>(`/api/legal/evidence?caseId=${encodeURIComponent(caseId)}`);
  return rows.map(mapEvidence);
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

const AUDIT_ACTION_MAP: Record<string, AuditAction> = {
  CREATE_CASE: 'CASE_CREATED',
  CASE_VIEWED: 'CASE_VIEWED',
  CREATE_DOC: 'FILE_UPLOADED',
  UPLOAD: 'EVIDENCE_UPLOADED',
  APPROVE: 'EVIDENCE_VERIFIED',
  ISSUE_CERT: 'EVIDENCE_VERIFIED',
  STATUS_UPDATE: 'HEARING_RECORDED',
  TRANSFER_CUSTODY: 'CUSTODY_TRANSFERRED',
  VISIBILITY_UPDATE: 'CUSTODY_TRANSFERRED',
  UPDATE_USER: 'CASE_VIEWED',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
};

const mapAuditLog = (row: any): AuditLogEntry => ({
  logId: row.log_id,
  caseId: row.case_id,
  timestamp: row.timestamp,
  actorName: row.user_name || row.user_id || 'System',
  actorDesignation: row.user_designation || row.user_role || '',
  action: AUDIT_ACTION_MAP[row.action] || 'CASE_VIEWED',
  targetLabel: row.detail_title || row.detail_file_name || row.evidence_id || row.case_id || '—',
  ipAddress: '—',
  device: row.source === 'MOBILE' ? 'Mobile App' : 'Web Portal',
});

export async function fetchAuditLogs(caseId: string): Promise<AuditLogEntry[]> {
  const rows = await request<any[]>(`/api/legal/audit/logs?caseId=${encodeURIComponent(caseId)}`);
  return rows.map(mapAuditLog);
}
