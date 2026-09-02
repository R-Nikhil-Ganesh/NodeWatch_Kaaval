import crypto from 'crypto';

const API_BASE = 'http://127.0.0.1:4000';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING KAAVAL END-TO-END INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`⏳ Testing: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (e) {
      console.log(`❌ FAILED: ${e.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test('1. Health & Infrastructure Check', async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.database !== 'connected') throw new Error('PostgreSQL disconnected');
  });

  // 2. Mobile Login
  let mobileToken = '';
  await test('2. Mobile Field Officer Authentication', async () => {
    const res = await fetch(`${API_BASE}/api/mobile/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'police1', password: 'password123' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('No JWT token returned');
    mobileToken = data.token;
  });

  // 3. Web Login
  let webToken = '';
  await test('3. Web Admin / Forensic Authentication', async () => {
    const res = await fetch(`${API_BASE}/api/web/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'forensic1', password: 'password123' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('No JWT token returned');
    webToken = data.token;
  });

  // 4. Create Case via Mobile
  const testCaseId = `CASE_TEST_${Date.now()}`;
  await test('4. Field Case Creation (/api/mobile/cases)', async () => {
    const res = await fetch(`${API_BASE}/api/mobile/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mobileToken}`,
      },
      body: JSON.stringify({
        caseId: testCaseId,
        title: 'Cybercrime Evidence Extraction Test Case',
        location: 'Anna Nagar, Chennai (Crime Scene)',
        officer: 'S. Murugan',
        userId: 'u_police_1',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.case_id !== testCaseId) throw new Error('Case ID mismatch in response');
  });

  // 5. Evidence Multipart Upload with real SHA-256 hash
  const testEvidenceId = `ev_test_${Date.now()}`;
  const mockFileContent = Buffer.from('KAAVAL DIGITAL FORENSIC EVIDENCE BINARY PAYLOAD ' + Date.now());
  const expectedSourceHash = crypto.createHash('sha256').update(mockFileContent).digest('hex');

  await test('5. Streaming Evidence Ingestion & SHA-256 Validation (/api/mobile/cases/:id/evidence)', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="crime_scene_photo.jpg"\r\n`;
    body += `Content-Type: image/jpeg\r\n\r\n`;
    const headerBuffer = Buffer.from(body, 'utf8');

    let footer = `\r\n--${boundary}\r\n`;
    footer += `Content-Disposition: form-data; name="evidenceId"\r\n\r\n${testEvidenceId}\r\n`;
    footer += `--${boundary}\r\n`;
    footer += `Content-Disposition: form-data; name="sourceHash"\r\n\r\n${expectedSourceHash}\r\n`;
    footer += `--${boundary}\r\n`;
    footer += `Content-Disposition: form-data; name="name"\r\n\r\nScene Image\r\n`;
    footer += `--${boundary}\r\n`;
    footer += `Content-Disposition: form-data; name="userId"\r\n\r\nu_police_1\r\n`;
    footer += `--${boundary}--\r\n`;
    const footerBuffer = Buffer.from(footer, 'utf8');

    const fullPayload = Buffer.concat([headerBuffer, mockFileContent, footerBuffer]);

    const res = await fetch(`${API_BASE}/api/mobile/cases/${testCaseId}/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${mobileToken}`,
      },
      body: fullPayload,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.evidence.file_hash !== expectedSourceHash) {
      throw new Error(`Hash mismatch: expected ${expectedSourceHash} vs server ${data.evidence.file_hash}`);
    }
    if (!data.evidence.uri || !data.evidence.uri.startsWith('http')) {
      throw new Error('Pre-signed download URL missing or invalid');
    }
  });

  // 6. Forensic Verification
  await test('6. Forensic Laboratory Hash Verification (/api/web/forensics/verify)', async () => {
    const res = await fetch(`${API_BASE}/api/web/forensics/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${webToken}`,
      },
      body: JSON.stringify({
        evidenceId: testEvidenceId,
        verifiedHash: expectedSourceHash,
        actorId: 'u_forensics_1',
        notes: 'Forensic Lab SHA-256 analysis confirmed exact match with scene capture',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.isMatch || data.integrityStatus !== 'VERIFIED') {
      throw new Error('Forensic validation did not return VERIFIED status');
    }
  });

  // 7. Section 63 Certificate Issuance
  const certRef = `BSA-SEC63-${Date.now().toString().slice(-6)}`;
  await test('7. BSA Section 63 Digital Certificate Issuance (/api/web/evidence/:id/section63)', async () => {
    const res = await fetch(`${API_BASE}/api/web/evidence/${testEvidenceId}/section63`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${webToken}`,
      },
      body: JSON.stringify({
        certificateRef: certRef,
        actorId: 'u_forensics_1',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cert = await res.json();
    if (cert.certificate_ref !== certRef) throw new Error('Certificate reference mismatch');
  });

  // 8. Offline Sync Push
  await test('8. Offline Batch Queue Sync (/api/mobile/sync/push)', async () => {
    const offlineCaseId = `CASE_OFFLINE_${Date.now()}`;
    const res = await fetch(`${API_BASE}/api/mobile/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mutations: [
          {
            queueId: 'q_1',
            entityType: 'CASE',
            entityId: offlineCaseId,
            actionType: 'CREATE',
            payload: {
              title: 'Offline Field Case',
              location: 'Remote Highway',
              officer_name: 'Field Officer',
            },
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.results || data.results[0].status !== 'ok') {
      throw new Error('Sync push failed for offline mutation');
    }
  });

  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');
}

runTests();
