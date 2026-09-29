'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://127.0.0.5:9000',
    region: process.env.MINIO_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ROOT_USER,
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD,
    },
    forcePathStyle: true,
  });
  const bucket = process.env.MINIO_BUCKET || 'evidence-vault';

  // Pass evidence_ids to keep as CLI args; with none, clears everything (old behavior).
  const keepIds = process.argv.slice(2);
  const keepClause = keepIds.length ? 'WHERE evidence_id != ALL($1)' : '';
  const keepParams = keepIds.length ? [keepIds] : [];

  try {
    const { rows } = await client.query(`SELECT evidence_id, file_url, thumbnail_url FROM evidence ${keepClause}`, keepParams);
    console.log(`Removing ${rows.length} evidence record(s) and their files${keepIds.length ? ` (keeping ${keepIds.join(', ')})` : ''}...`);

    await client.query('BEGIN');
    await client.query(`UPDATE evidence SET section63_cert_id = NULL ${keepClause}`, keepParams);
    await client.query(`DELETE FROM section63_certificates WHERE evidence_id IN (SELECT evidence_id FROM evidence ${keepClause})`, keepParams);
    await client.query(`DELETE FROM custody_transfers WHERE evidence_id IN (SELECT evidence_id FROM evidence ${keepClause})`, keepParams);
    await client.query(`DELETE FROM audit_logs WHERE evidence_id IN (SELECT evidence_id FROM evidence ${keepClause})`, keepParams);
    await client.query(`DELETE FROM blockchain_outbox WHERE entity_id IN (SELECT evidence_id FROM evidence ${keepClause})`, keepParams);
    await client.query(`DELETE FROM evidence ${keepClause}`, keepParams); // evidence_visibility cascades
    await client.query('COMMIT');

    for (const row of rows) {
      for (const url of [row.file_url, row.thumbnail_url]) {
        if (url && url.startsWith('minio://')) {
          const key = url.replace('minio://', '');
          try {
            await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
            console.log(`  deleted ${key}`);
          } catch (e) {
            console.warn(`  failed to delete ${key}:`, e.message);
          }
        }
      }
    }

    console.log('Done. Evidence table is now empty; case(s) and users left intact.');
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
