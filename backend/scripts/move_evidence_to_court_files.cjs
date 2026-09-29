'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: ev } = await client.query(
      `SELECT evidence_id, name, file_url, file_hash, uploaded_by, case_id FROM evidence WHERE name IN ('FIR', 'Witness_Statements')`
    );
    const fir = ev.find(e => e.name === 'FIR');
    const witness = ev.find(e => e.name === 'Witness_Statements');
    if (!fir || !witness) throw new Error(`Expected both FIR and Witness_Statements evidence rows, found: ${ev.map(e => e.name).join(', ')}`);

    await client.query('BEGIN');

    // Point the existing Court Files records at the real uploaded files
    // instead of the old (now-deleted) seed docx blobs.
    await client.query(
      `UPDATE case_documents SET file_url = $1, file_hash = $2, uploaded_by = $3
        WHERE type = 'FIR' AND case_id = $4`,
      [fir.file_url, fir.file_hash, fir.uploaded_by, fir.case_id]
    );
    await client.query(
      `UPDATE case_documents SET file_url = $1, file_hash = $2, uploaded_by = $3
        WHERE title ILIKE '%Witness Statement%' AND case_id = $4`,
      [witness.file_url, witness.file_hash, witness.uploaded_by, witness.case_id]
    );

    const idsToRemove = [fir.evidence_id, witness.evidence_id];
    await client.query(`UPDATE evidence SET section63_cert_id = NULL WHERE evidence_id = ANY($1)`, [idsToRemove]);
    await client.query(`DELETE FROM section63_certificates WHERE evidence_id = ANY($1)`, [idsToRemove]);
    await client.query(`DELETE FROM custody_transfers WHERE evidence_id = ANY($1)`, [idsToRemove]);
    await client.query(`DELETE FROM audit_logs WHERE evidence_id = ANY($1)`, [idsToRemove]);
    await client.query(`DELETE FROM blockchain_outbox WHERE entity_id = ANY($1)`, [idsToRemove]);
    // NOTE: deliberately NOT deleting the MinIO objects — case_documents now
    // points at these same files.
    await client.query(`DELETE FROM evidence WHERE evidence_id = ANY($1)`, [idsToRemove]); // evidence_visibility, forensic_records cascade

    await client.query('COMMIT');
    console.log('Moved FIR and Witness Statements into Court Files; removed them from the Evidence Ledger.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
