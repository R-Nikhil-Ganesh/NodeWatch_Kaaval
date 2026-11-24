// Integration tests for the mobile evidence-upload path.
// Needs a running backend (+ Postgres + MinIO). Run:  npm run test:mobile
// Env: API_BASE (default http://127.0.0.1:4000), TEST_USER / TEST_PASS.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const API = process.env.API_BASE || 'http://127.0.0.1:4000';
const USER = process.env.TEST_USER || 'police1';
const PASS = process.env.TEST_PASS || 'password123';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const uid = (p) => `${p}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

let userId;
let token;

async function createCase(id = uid('CASE_UT')) {
  const res = await fetch(`${API}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: id, title: 'Upload test case', location: 'Test', userId }),
  });
  assert.equal(res.status, 201, await res.clone().text());
  return id;
}

// Mirrors what the mobile client sends (multipart, no manual Content-Type).
function upload(caseId, { bytes, filename = 'photo.jpg', mime = 'image/jpeg', fields = {} } = {}) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime }), filename);
  for (const [k, v] of Object.entries({ userId, type: 'IMAGE', ...fields })) {
    if (v !== undefined) form.append(k, v);
  }
  return fetch(`${API}/cases/${caseId}/evidence`, { method: 'POST', body: form });
}

const listEvidence = async (caseId) =>
  (await (await fetch(`${API}/cases/${caseId}`)).json()).evidence;

test.before(async () => {
  const health = await fetch(`${API}/health`).catch(() => null);
  assert.ok(health?.ok, `Backend not reachable at ${API} — start it first`);
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  assert.equal(res.status, 200, 'login failed — check TEST_USER/TEST_PASS');
  const data = await res.json();
  token = data.token;
  userId = data.user.user_id || data.user.id;
});

test('login returns token and user id (same call the mobile app makes)', () => {
  assert.ok(token && userId);
});

test('upload stores file, server hash equals SHA-256 of the bytes, status UNVERIFIED', async () => {
  const caseId = await createCase();
  const bytes = Buffer.from('evidence-bytes-' + Date.now());
  const res = await upload(caseId, { bytes, fields: { name: 'Scene Photo', hash: sha256(bytes) } });
  assert.equal(res.status, 201, await res.clone().text());
  const { evidence } = await res.json();
  assert.equal(evidence.file_hash, sha256(bytes));
  assert.equal(evidence.integrity_status, 'UNVERIFIED');
  assert.match(evidence.uri, /^https?:\/\//);
});

test('client hash mismatch flags COMPROMISED', async () => {
  const caseId = await createCase();
  const res = await upload(caseId, { bytes: Buffer.from('real'), fields: { hash: sha256(Buffer.from('other')) } });
  assert.equal((await res.json()).evidence.integrity_status, 'COMPROMISED');
});

test('missing or placeholder (0x…) hash is NOT flagged as a mismatch', async () => {
  const caseId = await createCase();
  const none = await (await upload(caseId, { bytes: Buffer.from('a1') })).json();
  assert.equal(none.evidence.integrity_status, 'UNVERIFIED');
  const placeholder = await (await upload(caseId, { bytes: Buffer.from('a2'), fields: { hash: '0xabc123' } })).json();
  assert.equal(placeholder.evidence.integrity_status, 'UNVERIFIED');
});

test('extension comes from the real file when the display name has none (PNG not labelled .jpg)', async () => {
  const caseId = await createCase();
  const res = await upload(caseId, {
    bytes: Buffer.from('png-bytes'), filename: 'IMG_0001.png', mime: 'image/png', fields: { name: 'Victim Apparel' },
  });
  const { evidence } = await res.json();
  assert.equal(evidence.file_name, 'Victim Apparel.png');
  assert.equal(evidence.mime_type, 'image/png');
});

test('retrying the same evidenceId is idempotent (200, duplicate flag, one record)', async () => {
  const caseId = await createCase();
  const evidenceId = uid('ev_retry');
  const bytes = Buffer.from('retry-me');
  const first = await upload(caseId, { bytes, fields: { evidenceId } });
  assert.equal(first.status, 201);
  const second = await upload(caseId, { bytes, fields: { evidenceId } });
  assert.equal(second.status, 200);
  const body = await second.json();
  assert.equal(body.duplicate, true);
  assert.equal(body.evidence.evidence_id, evidenceId);
  assert.equal((await listEvidence(caseId)).length, 1);
});

test('concurrent identical uploads: all succeed, one record, stored file intact', async (t) => {
  const caseId = await createCase();
  const evidenceId = uid('ev_race');
  const bytes = Buffer.from('race-bytes-' + Date.now());
  const results = await Promise.all([1, 2, 3].map(() => upload(caseId, { bytes, fields: { evidenceId } })));
  for (const r of results) assert.ok([200, 201].includes(r.status), `status ${r.status}: ${await r.clone().text()}`);
  const evidence = await listEvidence(caseId);
  assert.equal(evidence.length, 1);
  // The losing requests must not have deleted the winner's object.
  const file = await fetch(evidence[0].uri).catch(() => null);
  if (!file) return t.skip('MinIO presigned URL not reachable from the test host');
  assert.equal(sha256(Buffer.from(await file.arrayBuffer())), sha256(bytes));
});

test('same evidenceId on a different case is rejected (409)', async () => {
  const a = await createCase();
  const b = await createCase();
  const evidenceId = uid('ev_cross');
  assert.equal((await upload(a, { bytes: Buffer.from('x'), fields: { evidenceId } })).status, 201);
  assert.equal((await upload(b, { bytes: Buffer.from('x'), fields: { evidenceId } })).status, 409);
});

test('rejections carry a status the client can distinguish from "offline"', async () => {
  const caseId = await createCase();
  assert.equal((await upload('NO_SUCH_CASE', { bytes: Buffer.from('x') })).status, 404);
  assert.equal((await upload(caseId, { bytes: Buffer.from('x'), fields: { type: 'image/jpeg' } })).status, 400);
  assert.equal((await upload(caseId, { bytes: Buffer.from('x'), fields: { userId: 'nobody' } })).status, 401);
  const noFile = await fetch(`${API}/cases/${caseId}/evidence`, { method: 'POST', body: new FormData() });
  assert.equal(noFile.status, 400);
});

test('case create is not duplicated; second create returns 409 (client treats as success)', async () => {
  const id = await createCase();
  const again = await fetch(`${API}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: id, title: 'dup', userId }),
  });
  assert.equal(again.status, 409);
});

test('sync push: offline case CREATE is idempotent and carries the creator', async () => {
  const id = uid('CASE_SYNC');
  const mutation = { entityType: 'CASE', entityId: id, actionType: 'CREATE', payload: { title: 'Offline', userId, officer_name: 'Officer' } };
  for (let i = 0; i < 2; i++) {
    const res = await fetch(`${API}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: [mutation] }),
    });
    assert.equal((await res.json()).results[0].status, 'ok');
  }
  const c = await (await fetch(`${API}/cases/${id}`)).json();
  assert.equal(c.created_by_user_id, userId);
});

test('case list embeds evidence with fields the app persists offline', async () => {
  const caseId = await createCase();
  await upload(caseId, { bytes: Buffer.from('list-me'), fields: { name: 'Listed' } });
  const all = await (await fetch(`${API}/cases`)).json();
  const c = all.find((x) => x.case_id === caseId);
  assert.ok(c, 'case missing from list');
  const ev = c.evidence[0];
  for (const k of ['evidence_id', 'id', 'hash', 'file_hash', 'uri', 'timestamp', 'type', 'file_name']) {
    assert.ok(k in ev, `evidence missing "${k}"`);
  }
});
