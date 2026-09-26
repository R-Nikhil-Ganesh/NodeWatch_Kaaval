#!/usr/bin/env node
'use strict';

/**
 * ============================================================================
 * NodeWatch / Kaaval — Remove All Case & Audit Log Data (03)
 * ============================================================================
 *
 * Safely removes all case data, evidence, court records, outbox queue entries,
 * and audit logs from PostgreSQL (kaaval_db), and purges uploaded files
 * from MinIO Object Storage (evidence-vault).
 *
 * Preserves all user accounts, role definitions, and database schemas.
 *
 *   Usage:  node "DB scripts/03_remove_all_case_data.cjs"
 *           node "DB scripts/03_remove_all_case_data.cjs" --dry-run
 *           node "DB scripts/03_remove_all_case_data.cjs" --keep-minio
 *
 *   --dry-run      Runs inside a rolled-back transaction to preview counts without deleting.
 *   --keep-minio   Skips deletion of uploaded exhibits/documents from MinIO.
 *
 * Connection details come from backend/.env (DATABASE_URL, MINIO_*).
 * Dependencies are resolved out of backend/node_modules.
 * ============================================================================
 */

const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const NODE_MODULES = path.join(REPO_ROOT, 'backend', 'node_modules');

require(path.join(NODE_MODULES, 'dotenv')).config({ path: path.join(REPO_ROOT, 'backend', '.env') });
const { Client } = require(path.join(NODE_MODULES, 'pg'));
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require(path.join(NODE_MODULES, '@aws-sdk/client-s3'));

const CONNECTION_STRING =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kaaval_db';

const MINIO_CONFIG = {
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  },
  forcePathStyle: true,
  bucket: process.env.MINIO_BUCKET || 'evidence-vault',
};

const TABLES_TO_REPORT = [
  'users',
  'cases',
  'evidence',
  'evidence_visibility',
  'custody_transfers',
  'case_custody_transfers',
  'section63_certificates',
  'case_documents',
  'case_parties',
  'case_hearings',
  'forensic_records',
  'custody_events',
  'alerts',
  'blockchain_outbox',
  'audit_logs',
];

async function getRowCounts(client) {
  const counts = {};
  for (const table of TABLES_TO_REPORT) {
    try {
      const res = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      counts[table] = res.rows[0].count;
    } catch {
      counts[table] = 'N/A';
    }
  }
  return counts;
}

async function purgeMinIOCases(dryRun) {
  const s3Client = new S3Client({
    endpoint: MINIO_CONFIG.endpoint,
    region: MINIO_CONFIG.region,
    credentials: MINIO_CONFIG.credentials,
    forcePathStyle: MINIO_CONFIG.forcePathStyle,
  });

  try {
    const listRes = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: MINIO_CONFIG.bucket,
        Prefix: 'cases/',
      })
    );

    const objects = listRes.Contents || [];
    console.log(`\n  MinIO bucket "${MINIO_CONFIG.bucket}":`);
    console.log(`    Found ${objects.length} object(s) with prefix "cases/".`);

    if (objects.length === 0) {
      console.log('    No MinIO files to remove.');
      return 0;
    }

    if (dryRun) {
      console.log('    [DRY RUN] Would delete the following objects:');
      objects.forEach((obj) => console.log(`      - ${obj.Key}`));
      return objects.length;
    }

    const deleteParams = {
      Bucket: MINIO_CONFIG.bucket,
      Delete: {
        Objects: objects.map((obj) => ({ Key: obj.Key })),
        Quiet: false,
      },
    };

    const deleteRes = await s3Client.send(new DeleteObjectsCommand(deleteParams));
    const deletedCount = (deleteRes.Deleted || []).length;
    console.log(`    Successfully deleted ${deletedCount} object(s) from MinIO.`);
    return deletedCount;
  } catch (err) {
    console.warn(`    ⚠️ MinIO cleanup warning: ${err.message}`);
    return 0;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const keepMinio = process.argv.includes('--keep-minio');

  console.log('\n=============================================================');
  console.log('  NodeWatch / Kaaval — Remove All Case & Audit Log Data');
  if (dryRun) console.log('  *** DRY RUN MODE — NO DATA WILL BE DELETED ***');
  console.log('=============================================================\n');

  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();

  try {
    console.log('[1/4] Reading initial database counts...');
    const initialCounts = await getRowCounts(client);
    console.log('  Current table counts:');
    Object.entries(initialCounts).forEach(([table, count]) => {
      console.log(`    ${table.padEnd(25)} : ${count}`);
    });

    console.log('\n[2/4] Deleting case data and audit logs in transaction...');
    await client.query('BEGIN');

    // 1. Break foreign key cycle between evidence and section63_certificates
    await client.query('UPDATE evidence SET section63_cert_id = NULL');

    // 2. Delete child / referencing records
    const deletionStatements = [
      ['alerts', 'DELETE FROM alerts'],
      ['audit_logs', 'DELETE FROM audit_logs'],
      ['blockchain_outbox', 'DELETE FROM blockchain_outbox'],
      ['case_custody_transfers', 'DELETE FROM case_custody_transfers'],
      ['custody_transfers', 'DELETE FROM custody_transfers'],
      ['section63_certificates', 'DELETE FROM section63_certificates'],
      ['forensic_records', 'DELETE FROM forensic_records'],
      ['custody_events', 'DELETE FROM custody_events'],
      ['evidence_visibility', 'DELETE FROM evidence_visibility'],
      ['case_documents', 'DELETE FROM case_documents'],
      ['case_parties', 'DELETE FROM case_parties'],
      ['case_hearings', 'DELETE FROM case_hearings'],
      ['evidence', 'DELETE FROM evidence'],
      ['cases', 'DELETE FROM cases'],
    ];

    for (const [name, sql] of deletionStatements) {
      const res = await client.query(sql);
      console.log(`    Cleared ${name.padEnd(25)} (${res.rowCount} row(s) deleted)`);
    }

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('\n  [DRY RUN] Rolled back transaction. Database unchanged.');
    } else {
      await client.query('COMMIT');
      console.log('\n  Transaction committed successfully.');
    }

    console.log('\n[3/4] Cleaning MinIO object storage...');
    if (keepMinio) {
      console.log('  --keep-minio supplied: skipped MinIO cleanup.');
    } else {
      await purgeMinIOCases(dryRun);
    }

    console.log('\n[4/4] Final verification check...');
    const finalCounts = await getRowCounts(client);
    console.log('  Final table counts:');
    Object.entries(finalCounts).forEach(([table, count]) => {
      const note = table === 'users' ? ' (PRESERVED)' : '';
      console.log(`    ${table.padEnd(25)} : ${count}${note}`);
    });

    console.log('\n=============================================================');
    if (dryRun) {
      console.log('  Dry run complete. No data was modified.');
    } else {
      console.log('  All case data and audit logs successfully cleared!');
      console.log('  Users preserved: ' + finalCounts.users + ' active accounts.');
    }
    console.log('=============================================================\n');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\nData clean FAILED:', err.message);
  if (err.detail) console.error('Detail:', err.detail);
  process.exit(1);
});

