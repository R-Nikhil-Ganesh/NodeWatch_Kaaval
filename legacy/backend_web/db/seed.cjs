/**
 * backend_web/db/seed.js
 *
 * Run with: node backend_web/db/seed.js
 *
 * Seeds the PostgreSQL database with:
 *  - Merged users (from backend_web/src/data.js + Kaaval_Frontend/src/data/mockData.ts)
 *  - Initial cases and evidence from frontend_web/constants.ts
 *
 * Safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING.
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// USER SEED DATA
// Merged from:
//   backend_web/src/data.js  (u_admin_1, u_admin_2, u_police_1, u_police_2,
//                              u_forensics_1, u_forensics_2, u_legal_1, u_legal_2)
//   Kaaval_Frontend/mockData.ts (u1 → investigator, u2 → forensics, admin1)
// ---------------------------------------------------------------------------
const USERS = [
  // --- Web app users (backend_web/src/data.js) ---
  {
    user_id: 'u_admin_1',
    username: 'admin1',
    email: 'rajendran.k@tnpolice.gov.in',
    password: 'password123',
    name: 'K. Rajendran',
    role: 'ADMIN',
    designation: 'IT Director',
    org_msp: 'Org1MSP',
  },
  {
    user_id: 'u_admin_2',
    username: 'admin2',
    email: 'priya.kumar@tnpolice.gov.in',
    password: 'password123',
    name: 'Priya Kumar',
    role: 'ADMIN',
    designation: 'System Administrator',
    org_msp: 'Org1MSP',
  },
  {
    user_id: 'u_police_1',
    username: 'police1',
    email: 'murugan.s@tnpolice.gov.in',
    password: 'password123',
    name: 'S. Murugan',
    role: 'POLICE',
    designation: 'Inspector of Police',
    badge_number: 'TN-PD-402',
    org_msp: 'Org1MSP',
  },
  {
    user_id: 'u_police_2',
    username: 'police2',
    email: 'anbu.selvam@tnpolice.gov.in',
    password: 'password123',
    name: 'Anbu Selvam',
    role: 'POLICE',
    designation: 'Superintendent of Police (SP)',
    badge_number: 'TN-PD-551',
    org_msp: 'Org1MSP',
  },
  {
    user_id: 'u_forensics_1',
    username: 'forensic1',
    email: 'karthik.venkat@tnfsl.gov.in',
    password: 'password123',
    name: 'Dr. Karthik Venkat',
    role: 'FORENSICS',
    designation: 'Senior Scientific Officer',
    org_msp: 'Org2MSP',
  },
  {
    user_id: 'u_forensics_2',
    username: 'forensic2',
    email: 'lakshmi.raman@tnfsl.gov.in',
    password: 'password123',
    name: 'Lakshmi Raman',
    role: 'FORENSICS',
    designation: 'Scientific Assistant',
    org_msp: 'Org2MSP',
  },
  {
    user_id: 'u_legal_1',
    username: 'legal1',
    email: 'vijay.sundaram@tngovt.in',
    password: 'password123',
    name: 'Vijay Sundaram',
    role: 'LEGAL',
    designation: 'Public Prosecutor',
    org_msp: 'Org2MSP',
  },
  {
    user_id: 'u_legal_2',
    username: 'legal2',
    email: 'meena.krishnan@tnhc.gov.in',
    password: 'password123',
    name: 'Meena Krishnan',
    role: 'LEGAL',
    designation: 'District Judge',
    org_msp: 'Org2MSP',
  },
  // --- Mobile app users (Kaaval_Frontend/src/data/mockData.ts) ---
  // u1 was 'investigator' role → maps to POLICE
  {
    user_id: 'u1',
    username: 'nikhil',
    email: 'nikhil@police.tn.gov',
    password: 'password123',
    name: 'Nikhil Ganesh',
    role: 'POLICE',
    designation: 'Inspector of Police',
    badge_number: 'TN-KK-001',
    org_msp: 'Org1MSP',
  },
  // u2 was 'forensics'
  {
    user_id: 'u2',
    username: 'kavitha',
    email: 'kavitha@lab.tn.gov',
    password: 'password123',
    name: 'Dr. Kavitha',
    role: 'FORENSICS',
    designation: 'Senior Scientific Officer',
    org_msp: 'Org2MSP',
  },
  // admin1 mobile admin
  {
    user_id: 'admin1',
    username: 'mob_admin',
    email: 'admin@police.tn.gov',
    password: 'adminpassword',
    name: 'Superintendent (Admin)',
    role: 'ADMIN',
    designation: 'System Administrator',
    org_msp: 'Org1MSP',
  },
];

// ---------------------------------------------------------------------------
// SEED CASES
// ---------------------------------------------------------------------------
const CASES = [];

// ---------------------------------------------------------------------------
// SEED EVIDENCE
// ---------------------------------------------------------------------------
const EVIDENCE = [];

// ---------------------------------------------------------------------------
// RUNNER
// ---------------------------------------------------------------------------
async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Users ---
    console.log('Seeding users...');
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      await client.query(
        `INSERT INTO users
           (user_id, username, email, password_hash, name, role, designation, badge_number, org_msp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (user_id) DO NOTHING`,
        [u.user_id, u.username, u.email, hash, u.name, u.role,
         u.designation || '', u.badge_number || null, u.org_msp || 'Org1MSP']
      );
    }

    // --- Cases ---
    console.log('Seeding cases...');
    for (const c of CASES) {
      await client.query(
        `INSERT INTO cases
           (case_id, title, description, status, location,
            created_by_user_id, current_custodian_id, current_custodian_name,
            assigned_forensics_id, blockchain_hash, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
         ON CONFLICT (case_id) DO NOTHING`,
        [
          c.case_id, c.title, c.description || '', c.status, c.location,
          c.created_by_user_id, c.current_custodian_id,
          c.current_custodian_name || null,
          c.assigned_forensics_id || null,
          c.blockchain_hash || 'pending',
          c.created_at,
        ]
      );
    }

    // --- Evidence + default visibility ---
    console.log('Seeding evidence...');
    for (const e of EVIDENCE) {
      await client.query(
        `INSERT INTO evidence
           (evidence_id, case_id, name, file_name, type, file_url,
            file_hash, metadata_hash, source_hash, lifting_video_url, lifting_video_hash,
            classification, integrity_status, approved_for_legal, notes,
            uploaded_by, current_custodian_id, current_custodian_name,
            owner_msp, collected_location, linked_evidence_ids, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$22)
         ON CONFLICT (evidence_id) DO NOTHING`,
        [
          e.evidence_id, e.case_id, e.name, e.file_name, e.type, e.file_url,
          e.file_hash, e.metadata_hash, e.source_hash || null,
          e.lifting_video_url || null, e.lifting_video_hash || null,
          e.classification, e.integrity_status, e.approved_for_legal, e.notes || null,
          e.uploaded_by, e.current_custodian_id, e.current_custodian_name || null,
          e.owner_msp, e.collected_location || null,
          e.linked_evidence_ids || '[]',
          e.created_at,
        ]
      );
      // Default open visibility for each evidence item
      await client.query(
        `INSERT INTO evidence_visibility (evidence_id) VALUES ($1)
         ON CONFLICT (evidence_id) DO NOTHING`,
        [e.evidence_id]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
