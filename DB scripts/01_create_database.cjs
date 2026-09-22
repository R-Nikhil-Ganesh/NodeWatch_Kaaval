#!/usr/bin/env node
'use strict';

/**
 * ============================================================================
 * NodeWatch / Kaaval — Database Creation Script (01)
 * ============================================================================
 *
 * Creates the `kaaval_db` database (if absent) and applies the complete
 * schema: base tables, the legal/court extension, the case-priority
 * extension, and the investigation/police extension.
 *
 * Safe to re-run at any time — every step is idempotent.
 *
 *   Usage:  node "DB scripts/01_create_database.cjs"
 *           node "DB scripts/01_create_database.cjs" --reset
 *
 *   --reset   Drops and recreates the public schema first (DESTROYS ALL DATA).
 *
 * Connection is read from backend/.env (DATABASE_URL), falling back to
 * postgresql://postgres:postgres@localhost:5432/kaaval_db
 *
 * The SQL itself deliberately lives in backend/src/db/*.sql rather than being
 * duplicated here, so this script and the server's own startup migration can
 * never drift apart.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const DB_DIR = path.join(REPO_ROOT, 'backend', 'src', 'db');

// Dependencies are resolved out of backend/node_modules so this folder needs
// no package.json or install step of its own.
const NODE_MODULES = path.join(REPO_ROOT, 'backend', 'node_modules');
require(path.join(NODE_MODULES, 'dotenv')).config({ path: path.join(REPO_ROOT, 'backend', '.env') });
const { Client } = require(path.join(NODE_MODULES, 'pg'));

const CONNECTION_STRING =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kaaval_db';

// Applied in order. The base schema is only applied to a virgin database;
// the extensions are additive and idempotent, so they always run.
const EXTENSIONS = [
  ['legal_extension.sql', 'Legal / Court Management domain'],
  ['priority_extension.sql', 'Case priority triage'],
  ['investigation_extension.sql', 'Investigation / Police domain'],
];

function parseConnectionString(cs) {
  const url = new URL(cs);
  return {
    database: decodeURIComponent(url.pathname.replace(/^\//, '')) || 'kaaval_db',
    adminConnectionString: `${url.protocol}//${url.username}:${url.password}@${url.host}/postgres`,
  };
}

function readSql(fileName) {
  const filePath = path.join(DB_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required SQL file is missing: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

async function ensureDatabaseExists(dbName, adminConnectionString) {
  const admin = new Client({ connectionString: adminConnectionString });
  await admin.connect();
  try {
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length) {
      console.log(`  Database "${dbName}" already exists.`);
      return false;
    }
    // Identifier cannot be parameterised; quote it to stay injection-safe.
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`  Database "${dbName}" created.`);
    return true;
  } finally {
    await admin.end();
  }
}

async function main() {
  const reset = process.argv.includes('--reset');
  const { database, adminConnectionString } = parseConnectionString(CONNECTION_STRING);

  console.log('\n=== NodeWatch DB — Schema Setup ===\n');
  console.log(`  Target database: ${database}`);

  console.log('\n[1/3] Ensuring database exists...');
  await ensureDatabaseExists(database, adminConnectionString);

  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();

  try {
    if (reset) {
      console.log('\n  --reset supplied: dropping and recreating schema "public"...');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      console.log('  Schema reset. All previous data has been destroyed.');
    }

    console.log('\n[2/3] Applying base schema...');
    const { rows } = await client.query(`SELECT to_regclass('public.users') AS exists`);
    if (rows[0].exists) {
      console.log('  Base schema already present, skipping.');
    } else {
      await client.query(readSql('schema.sql'));
      console.log('  Base schema applied (enums, users, cases, evidence, custody, audit, outbox).');
    }

    console.log('\n[3/3] Applying additive extensions...');
    for (const [file, label] of EXTENSIONS) {
      await client.query(readSql(file));
      console.log(`  ${label} applied.`);
    }

    const { rows: tables } = await client.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name`
    );
    console.log(`\n  ${tables.length} tables ready:`);
    console.log(`    ${tables.map((t) => t.table_name).join(', ')}`);

    console.log('\nSchema setup complete.');
    console.log('Next: node "DB scripts/02_seed_mock_data.cjs"\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\nSchema setup FAILED:', err.message);
  process.exit(1);
});
