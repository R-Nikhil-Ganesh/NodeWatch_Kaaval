import cors from 'cors';
import express from 'express';
import { v4 as uuid } from 'uuid';
import { state, DESIGNATIONS } from './data.js';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

const sanitizeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

const recordLog = (entry) => {
  const log = {
    id: `log_${uuid()}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  state.logs.unshift(log);
  return log;
};

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = state.users.find(
    (u) => u.username === username && (!u.password || u.password === password)
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  recordLog({
    accessedBy: user.id,
    role: user.role,
    action: 'LOGIN',
    details: 'User logged in'
  });

  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const { userId } = req.body || {};
  const user = state.users.find((u) => u.id === userId);

  if (user) {
    recordLog({
      accessedBy: user.id,
      role: user.role,
      action: 'LOGOUT',
      details: 'User logged out'
    });
  }

  res.json({ ok: true });
});

app.get('/api/users', (req, res) => {
  res.json(state.users.map(sanitizeUser));
});

app.patch('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ message: 'User not found' });

  const updates = req.body || {};
  const allowed = ['name', 'designation', 'role', 'profileImage'];
  const nextUser = { ...state.users[idx] };

  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      nextUser[field] = updates[field];
    }
  });

  state.users[idx] = nextUser;

  recordLog({
    accessedBy: updates.actorId || id,
    role: updates.actorRole || nextUser.role,
    action: 'UPDATE_USER',
    details: `Updated profile for ${nextUser.name} (${nextUser.role})`
  });

  res.json(sanitizeUser(nextUser));
});

app.get('/api/cases', (req, res) => {
  const sorted = [...state.cases].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

app.post('/api/cases', (req, res) => {
  const payload = req.body || {};
  const now = new Date().toISOString();
  const caseId =
    payload.caseId || `CASE-${new Date().getFullYear()}-${String(state.cases.length + 1).padStart(3, '0')}-${uuid().slice(0, 4)}`;

  const newCase = {
    caseId,
    title: payload.title || 'Untitled Case',
    description: payload.description || 'No description provided.',
    status: payload.status || 'OPEN',
    currentCustodian: payload.currentCustodian || payload.createdBy || 'Unassigned',
    createdBy: payload.createdBy || 'system',
    createdAt: payload.createdAt || now,
    assignedToForensics: payload.assignedToForensics
  };

  state.cases.unshift(newCase);

  recordLog({
    caseId: newCase.caseId,
    accessedBy: payload.actorId || newCase.createdBy,
    role: payload.actorRole || 'ADMIN',
    action: 'CREATE_CASE',
    details: `Created case ${newCase.caseId}`
  });

  res.status(201).json(newCase);
});

app.patch('/api/cases/:caseId/status', (req, res) => {
  const { caseId } = req.params;
  const { status, actorId, actorRole } = req.body || {};
  const target = state.cases.find((c) => c.caseId === caseId);
  if (!target) return res.status(404).json({ message: 'Case not found' });

  target.status = status || target.status;

  recordLog({
    caseId,
    accessedBy: actorId || target.createdBy,
    role: actorRole || 'ADMIN',
    action: 'APPROVE',
    details: `Status changed to ${target.status}`
  });

  res.json(target);
});

app.post('/api/cases/:caseId/transfer-custody', (req, res) => {
  const { caseId } = req.params;
  const { newCustodianId, newCustodianRole, notes, actorId, actorRole } = req.body || {};
  const target = state.cases.find((c) => c.caseId === caseId);
  if (!target) return res.status(404).json({ message: 'Case not found' });

  const user = state.users.find((u) => u.id === newCustodianId);
  const custodianName = user ? user.name : newCustodianId;
  target.currentCustodian = custodianName;

  recordLog({
    caseId,
    accessedBy: actorId || target.createdBy,
    role: actorRole || 'ADMIN',
    action: 'TRANSFER_CUSTODY',
    details: `Case custody transferred to ${custodianName} (${newCustodianRole || 'N/A'}). ${notes || ''}`
  });

  res.json(target);
});

app.get('/api/evidence', (req, res) => {
  res.json(state.evidence);
});

const classifyEvidence = (payload) => {
  const hasPrimaryProof = payload.sourceHash && payload.liftingVideo;
  return hasPrimaryProof ? 'PRIMARY' : 'SECONDARY';
};

app.post('/api/evidence', (req, res) => {
  const payload = req.body || {};
  const now = new Date().toISOString();
  const classification = classifyEvidence(payload);
  const evidenceId = payload.evidenceId || `EV-${uuid().slice(0, 6)}`;

  const newEvidence = {
    evidenceId,
    caseId: payload.caseId,
    type: payload.type || 'IMAGE',
    fileName: payload.fileName || 'upload.bin',
    uploadedBy: payload.uploadedBy || 'system',
    role: payload.role || 'POLICE',
    timestamp: payload.timestamp || now,
    location: payload.location || 'Not specified',
    fileHash: payload.fileHash || uuid(),
    metadataHash: payload.metadataHash || uuid(),
    custodian: payload.custodian || 'Evidence Locker',
    integrityStatus: payload.integrityStatus || 'NOT_CHECKED',
    approvedForLegal: payload.approvedForLegal || false,
    visibility: payload.visibility || {
      isRestricted: false,
      allowedRoles: [],
      allowedDesignations: [],
      allowedUserIds: []
    },
    notes: payload.notes,
    linkedEvidenceIds: payload.linkedEvidenceIds || [],
    classification,
    sourceHash: payload.sourceHash,
    liftingVideo: payload.liftingVideo,
    liftingVideoHash: payload.liftingVideoHash,
    section63Certificate: payload.section63Certificate
  };

  state.evidence.push(newEvidence);

  recordLog({
    evidenceId,
    caseId: payload.caseId,
    accessedBy: payload.actorId || payload.uploadedBy || 'system',
    role: payload.actorRole || payload.role || 'POLICE',
    action: 'UPLOAD',
    details: `Uploaded ${newEvidence.fileName} (${newEvidence.type}) as ${classification}`
  });

  res.status(201).json(newEvidence);
});

app.patch('/api/evidence/:id/verify', (req, res) => {
  const { id } = req.params;
  const { actorId, actorRole } = req.body || {};
  const target = state.evidence.find((e) => e.evidenceId === id);
  if (!target) return res.status(404).json({ message: 'Evidence not found' });

  const isCompromised = target.integrityStatus === 'COMPROMISED';
  target.integrityStatus = isCompromised ? 'COMPROMISED' : 'VERIFIED';

  recordLog({
    evidenceId: id,
    caseId: target.caseId,
    accessedBy: actorId || target.uploadedBy,
    role: actorRole || target.role,
    action: 'VERIFY',
    details: 'Run integrity verification check'
  });

  res.json(target);
});

app.patch('/api/evidence/:id/approve', (req, res) => {
  const { id } = req.params;
  const { actorId, actorRole } = req.body || {};
  const target = state.evidence.find((e) => e.evidenceId === id);
  if (!target) return res.status(404).json({ message: 'Evidence not found' });

  const canBeApproved = target.classification === 'PRIMARY' || !!target.section63Certificate;
  if (!canBeApproved) {
    return res.status(400).json({ message: 'Cannot approve Secondary evidence without a Section 63 Certificate.' });
  }

  target.approvedForLegal = true;

  recordLog({
    evidenceId: id,
    caseId: target.caseId,
    accessedBy: actorId || target.uploadedBy,
    role: actorRole || target.role,
    action: 'APPROVE',
    details: 'Evidence approved for legal proceedings'
  });

  res.json(target);
});

app.patch('/api/evidence/:id/visibility', (req, res) => {
  const { id } = req.params;
  const { visibility, actorId, actorRole } = req.body || {};
  const target = state.evidence.find((e) => e.evidenceId === id);
  if (!target) return res.status(404).json({ message: 'Evidence not found' });

  target.visibility = visibility || target.visibility;

  recordLog({
    evidenceId: id,
    caseId: target.caseId,
    accessedBy: actorId || target.uploadedBy,
    role: actorRole || target.role,
    action: 'VISIBILITY_UPDATE',
    details: `Access controls updated${target.visibility.isRestricted ? ' (Restricted)' : ' (Public)'}`
  });

  res.json(target);
});

app.post('/api/evidence/:id/section63', (req, res) => {
  const { id } = req.params;
  const { certificateRef, actorId, actorRole } = req.body || {};
  const target = state.evidence.find((e) => e.evidenceId === id);
  if (!target) return res.status(404).json({ message: 'Evidence not found' });

  target.section63Certificate = certificateRef || target.section63Certificate;

  recordLog({
    evidenceId: id,
    caseId: target.caseId,
    accessedBy: actorId || target.uploadedBy,
    role: actorRole || target.role,
    action: 'ISSUE_CERT',
    details: 'Section 63 Certificate issued for Secondary Evidence'
  });

  res.json(target);
});

app.get('/api/documents', (req, res) => {
  res.json(state.documents);
});

app.post('/api/documents', (req, res) => {
  const payload = req.body || {};
  const now = new Date().toISOString();
  const doc = {
    docId: payload.docId || `doc_${uuid()}`,
    caseId: payload.caseId,
    title: payload.title || 'Untitled document',
    type: payload.type || 'FIR',
    description: payload.description,
    uploadedBy: payload.uploadedBy || 'system',
    timestamp: payload.timestamp || now,
    linkedEvidenceIds: payload.linkedEvidenceIds || []
  };

  state.documents.push(doc);

  recordLog({
    caseId: doc.caseId,
    accessedBy: payload.actorId || doc.uploadedBy,
    role: payload.actorRole || 'ADMIN',
    action: 'CREATE_DOC',
    details: `Created ${doc.type}: ${doc.title}`
  });

  res.status(201).json(doc);
});

app.get('/api/logs', (req, res) => {
  const limit = Number(req.query.limit) || 200;
  res.json(state.logs.slice(0, limit));
});

app.post('/api/logs', (req, res) => {
  const payload = req.body || {};
  const log = recordLog(payload);
  res.status(201).json(log);
});

app.get('/api/designations', (req, res) => {
  res.json(DESIGNATIONS);
});

app.use((err, req, res, next) => {
  // Minimal error handler to avoid noisy stack traces to the client.
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

app.listen(PORT, () => {
  console.log(`backend_web listening on port ${PORT}`);
});
