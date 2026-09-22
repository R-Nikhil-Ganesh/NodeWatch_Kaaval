#!/usr/bin/env node
'use strict';

/**
 * ============================================================================
 * NodeWatch / Kaaval — Development Data Seed Script (02)
 * ============================================================================
 *
 * Loads the full investigation dataset (officers, cases, evidence, forensic
 * records, chain-of-custody events, alerts and audit trail) into Postgres.
 *
 * This is the dataset that used to be hardcoded in
 * `frontend_web/services/mockData.ts`. It now lives here and is served to
 * every portal through the API, so the UI has a single source of truth.
 *
 * Safe to re-run — every insert is an idempotent UPSERT keyed on the
 * primary key, so running it twice refreshes rows instead of duplicating.
 *
 *   Usage:  node "DB scripts/02_seed_mock_data.cjs"
 *           node "DB scripts/02_seed_mock_data.cjs" --purge
 *
 *   --purge   Deletes this dataset's rows first (only rows it owns — the
 *             pre-existing court/legal dataset is never touched).
 *
 * Run `01_create_database.cjs` first.
 *
 * NOTE ON DERIVED FIGURES: per-case evidence counts and forensic progress
 * are intentionally NOT stored. The API computes them from the evidence and
 * forensic_records rows, so the dashboards can never drift from reality.
 * ============================================================================
 */

const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
// Dependencies are resolved out of backend/node_modules so this folder needs
// no package.json or install step of its own.
const NODE_MODULES = path.join(REPO_ROOT, 'backend', 'node_modules');
require(path.join(NODE_MODULES, 'dotenv')).config({ path: path.join(REPO_ROOT, 'backend', '.env') });
const { Client } = require(path.join(NODE_MODULES, 'pg'));
const bcrypt = require(path.join(NODE_MODULES, 'bcryptjs'));

const CONNECTION_STRING =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kaaval_db';

const SEED_PASSWORD = 'password123';

// ---------------------------------------------------------------------------
// Identifier convention
// ---------------------------------------------------------------------------
// The UI historically keyed everything on the FIR number ("FIR 142/2026").
// Postgres keys on `case_id`. `fir_number` is stored WITHOUT the "FIR "
// prefix to match the rows already in the table (e.g. "412/2024") — the UI
// adds the prefix when rendering.
const caseIdFor = (firNumber) => {
  const [num, year] = firNumber.replace(/^FIR\s+/i, '').split('/');
  return `CASE-${year}-${num}`;
};
const firNumberFor = (firNumber) => firNumber.replace(/^FIR\s+/i, '');

// ---------------------------------------------------------------------------
// OFFICERS — the people named throughout the dataset, as real user rows so
// they appear in admin user management and can hold custody.
// ---------------------------------------------------------------------------
const OFFICERS = [
  ['u_io_arun', 'SI Arun Kumar', 'POLICE', 'Sub-Inspector of Police', 'TN-SI-4471'],
  ['u_io_ravi', 'Constable Ravi', 'POLICE', 'Police Constable', 'TN-PC-9082'],
  ['u_io_ravi_m', 'Constable Ravi M', 'POLICE', 'Police Constable', 'TN-PC-9083'],
  ['u_io_priya_m', 'DSP Priya Menon', 'POLICE', 'Deputy Superintendent of Police', 'TN-DSP-1120'],
  ['u_io_vikram', 'SI Vikram Nair', 'POLICE', 'Sub-Inspector of Police', 'TN-SI-4488'],
  ['u_io_deepa', 'Inspector Deepa Srinivas', 'POLICE', 'Inspector of Police', 'TN-INSP-2210'],
  ['u_io_rajan', 'SI Rajan Pillai', 'POLICE', 'Sub-Inspector of Police', 'TN-SI-4502'],
  ['u_io_kavitha_r', 'DSP Kavitha Reddy', 'POLICE', 'Deputy Superintendent of Police', 'TN-DSP-1145'],
  ['u_io_mohan', 'SI Mohan Das', 'POLICE', 'Sub-Inspector of Police', 'TN-SI-4519'],
  ['u_io_rekha', 'Inspector Rekha Thomas', 'POLICE', 'Inspector of Police', 'TN-INSP-2245'],
  ['u_io_bharat', 'Constable K. Bharat', 'POLICE', 'Police Constable', 'TN-PC-9140'],
  ['u_io_venkatesh', 'Head Constable Venkatesh', 'POLICE', 'Head Constable', 'TN-HC-6610'],
  ['u_io_store', 'Evidence Store Officer', 'POLICE', 'Evidence Store Officer', 'TN-ESO-0071'],
  ['u_fsl_subramaniam', 'FSL Officer Subramaniam', 'FORENSICS', 'FSL Officer', 'FSL-OFF-3301'],
  ['u_fsl_anitha', 'Dr. Anitha Krishnan', 'FORENSICS', 'Senior Scientific Officer', 'FSL-SSO-1180'],
  ['u_fsl_ramesh', 'Dr. Ramesh Bhat', 'FORENSICS', 'Scientific Officer', 'FSL-SO-1195'],
  ['u_fsl_sunitha', 'Dr. Sunitha Rao', 'FORENSICS', 'Scientific Officer', 'FSL-SO-1203'],
  ['u_fsl_lakshmi_p', 'Dr. Lakshmi Prasad', 'FORENSICS', 'Senior Scientific Officer', 'FSL-SSO-1188'],
  ['u_fsl_suresh', 'Dr. Suresh Kumar', 'FORENSICS', 'Senior Scientific Officer', 'FSL-SSO-1192'],
];

const emailFor = (name) =>
  `${name
    .toLowerCase()
    .replace(/^(si|dsp|inspector|constable|head constable|dr\.?|fsl officer)\s+/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')}@${name.startsWith('Dr.') || name.includes('FSL') ? 'tnfsl.gov.in' : 'tnpolice.gov.in'}`;

// Map a display name -> user_id, so denormalised name fields can also carry a
// real FK where one exists.
const USER_ID_BY_NAME = OFFICERS.reduce((acc, [id, name]) => {
  acc[name] = id;
  return acc;
}, {});

// ---------------------------------------------------------------------------
// CASES
// ---------------------------------------------------------------------------
const CASES = [
  {
    firNumber: 'FIR 142/2026',
    title: 'State vs. Unknown',
    policeStation: 'Central Police Station',
    dateRegistered: '2026-09-02T10:00:00.000Z',
    investigatingOfficer: 'SI Arun Kumar',
    witnessCount: 4,
    offences: ['IPC 302', 'IPC 201', 'IPC 120B'],
    cocStatus: 'Verified',
    status: 'UNDER_INVESTIGATION',
    lastUpdated: '2026-09-15T14:22:00.000Z',
    description:
      'Homicide case registered at Central PS, Bengaluru. Victim found at Koramangala residential area. Investigation ongoing; primary suspect yet to be identified. Multiple digital and physical evidence items collected from crime scene.',
    district: 'Bengaluru Urban',
    caseType: 'Murder',
    isPriority: true,
  },
  {
    firNumber: 'FIR 089/2026',
    title: 'State vs. Ramesh Babu',
    policeStation: 'Koramangala PS',
    dateRegistered: '2026-07-15T08:30:00.000Z',
    investigatingOfficer: 'DSP Priya Menon',
    witnessCount: 3,
    offences: ['IPC 379', 'IPC 411'],
    cocStatus: 'Verified',
    status: 'CHARGE_SHEET_PREPARATION',
    lastUpdated: '2026-09-14T09:10:00.000Z',
    description:
      'Theft and receiving stolen property case. Accused Ramesh Babu apprehended in possession of stolen goods valued at ₹4,80,000. All forensic examinations completed; charge sheet under preparation.',
    district: 'Bengaluru Urban',
    caseType: 'Theft',
    isPriority: false,
  },
  {
    firNumber: 'FIR 201/2026',
    title: 'State vs. Multiple Accused',
    policeStation: 'HSR Layout PS',
    dateRegistered: '2026-09-08T11:45:00.000Z',
    investigatingOfficer: 'SI Vikram Nair',
    witnessCount: 7,
    offences: ['IPC 420', 'IPC 467', 'IPC 468', 'IT Act 66C'],
    cocStatus: 'Pending',
    status: 'AWAITING_FORENSICS',
    lastUpdated: '2026-09-15T17:55:00.000Z',
    description:
      'Large-scale financial fraud and identity theft involving multiple accused persons. Digital forensics ongoing on 13 seized electronic devices. Forgery of official documents also suspected.',
    district: 'Bengaluru Urban',
    caseType: 'Cyber Crime',
    isPriority: true,
  },
  {
    firNumber: 'FIR 056/2026',
    title: 'State vs. Unknown',
    policeStation: 'Whitefield PS',
    dateRegistered: '2026-06-01T06:20:00.000Z',
    investigatingOfficer: 'Inspector Deepa Srinivas',
    witnessCount: 2,
    offences: ['IPC 376'],
    cocStatus: 'Verified',
    status: 'CHARGE_SHEET_PREPARATION',
    lastUpdated: '2026-09-12T13:40:00.000Z',
    description:
      'Sexual assault case filed at Whitefield PS. All medical and forensic evidence collected and examined. Victim statement recorded. Case under judicial scrutiny; charge sheet being finalized.',
    district: 'Bengaluru Urban',
    caseType: 'Sexual Offence',
    isPriority: true,
  },
  {
    firNumber: 'FIR 178/2026',
    title: 'State vs. Suresh Kumar',
    policeStation: 'Jayanagar PS',
    dateRegistered: '2026-08-20T21:15:00.000Z',
    investigatingOfficer: 'SI Rajan Pillai',
    witnessCount: 5,
    offences: ['IPC 302', 'IPC 34'],
    cocStatus: 'Pending',
    status: 'UNDER_INVESTIGATION',
    lastUpdated: '2026-09-16T08:05:00.000Z',
    description:
      'Homicide case with accused Suresh Kumar in custody. Act committed in furtherance of common intention with unknown accomplices. Forensic ballistics and trace evidence examination pending.',
    district: 'Bengaluru South',
    caseType: 'Murder',
    isPriority: true,
  },
  {
    firNumber: 'FIR 033/2026',
    title: 'State vs. Unknown',
    policeStation: 'Indiranagar PS',
    dateRegistered: '2026-04-10T22:00:00.000Z',
    investigatingOfficer: 'DSP Kavitha Reddy',
    witnessCount: 1,
    offences: ['IPC 392'],
    cocStatus: 'Verified',
    status: 'CLOSED',
    lastUpdated: '2026-08-30T15:00:00.000Z',
    description:
      'Robbery case. Accused identified through CCTV footage and apprehended within 72 hours. Final report filed. Case closed following conviction.',
    district: 'Bengaluru Urban',
    caseType: 'Robbery',
    isPriority: false,
  },
  {
    firNumber: 'FIR 215/2026',
    title: 'State vs. Multiple',
    policeStation: 'Electronic City PS',
    dateRegistered: '2026-09-10T16:30:00.000Z',
    investigatingOfficer: 'SI Mohan Das',
    witnessCount: 4,
    offences: ['IT Act 66', 'IT Act 66C', 'IPC 420'],
    cocStatus: 'Exception',
    status: 'AWAITING_FORENSICS',
    lastUpdated: '2026-09-16T10:30:00.000Z',
    description:
      'Cybercrime case involving unauthorized access to corporate servers and identity fraud. Hash integrity mismatch detected on EV-0215. Chain-of-custody exception raised; internal review initiated.',
    district: 'Bengaluru Urban',
    caseType: 'Cyber Crime',
    isPriority: true,
  },
  {
    firNumber: 'FIR 067/2026',
    title: 'State vs. Anand Varma',
    policeStation: 'Shivajinagar PS',
    dateRegistered: '2026-06-25T14:10:00.000Z',
    investigatingOfficer: 'Inspector Rekha Thomas',
    witnessCount: 6,
    offences: ['IPC 302', 'IPC 201'],
    cocStatus: 'Verified',
    status: 'CHARGE_SHEET_PREPARATION',
    lastUpdated: '2026-09-13T11:20:00.000Z',
    description:
      'Homicide case against accused Anand Varma. All 14 evidence items forensically examined and reports received. Accused in judicial custody. Charge sheet under finalization for submission to court.',
    district: 'Bengaluru Central',
    caseType: 'Murder',
    isPriority: false,
  },
];

// ---------------------------------------------------------------------------
// EVIDENCE
// `type` carries the IO-facing descriptive kind and is stored in
// evidence.category; `enumType` is the machine file-type for evidence.type.
// ---------------------------------------------------------------------------
const EVIDENCE = [
  // ---- FIR 142/2026 ----
  { evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', type: 'Mobile Device', enumType: 'DISK_IMAGE', description: 'Black Samsung Galaxy smartphone recovered from crime scene. IMEI: 358971234567890. Screen cracked. Stored in anti-static evidence bag.', collectedAt: '2026-09-02T18:32:00.000Z', collectedLocation: 'Crime Scene A, Koramangala, Bengaluru', collectedBy: 'SI Arun Kumar', currentCustodian: 'Evidence Store Officer', currentLocation: 'Central Police Station Evidence Store', status: 'Secure Storage', integrityStatus: 'VERIFIED', forensicStatus: 'Report Available', sha256Hash: 'a83f91bc4d27e9f3a1c85b67d204f9e82c3a7b164f98e2d51b4c9a230f891bc4', blockchainTxId: 'TX-8F21A4B9', blockchainVerified: true, sealId: 'SEAL-9821', notes: 'Device found switched off. Battery removed and stored separately. Forensic examination complete; detailed digital report received from FSL Bengaluru.' },
  { evidenceId: 'EV-0143', caseFir: 'FIR 142/2026', type: 'CCTV Footage', enumType: 'VIDEO', description: 'Digital video footage from ATM surveillance camera, 720p resolution, 2 hours duration covering 17:00–19:00 hrs on 02-Sep-2026. Copied to encrypted USB drive.', collectedAt: '2026-09-02T19:15:00.000Z', collectedLocation: 'ATM Branch, 5th Block, Koramangala, Bengaluru', collectedBy: 'SI Arun Kumar', currentCustodian: 'Evidence Store Officer', currentLocation: 'Digital Evidence Server, Central PS', status: 'Secure Storage', integrityStatus: 'VERIFIED', forensicStatus: 'Report Available', sha256Hash: 'c72e4a8b19df3c5e7f2a90b43d651c8e7f1b2a9d4c56e3f8a1b72c9e4d530f7a', blockchainTxId: 'TX-8F21A4C2', blockchainVerified: true, sealId: 'SEAL-9822', notes: 'Original footage secured at ATM branch with NOC obtained. Hash verified at time of collection and again after transfer.' },
  { evidenceId: 'EV-0144', caseFir: 'FIR 142/2026', type: 'Fingerprint Lift', enumType: 'PHYSICAL', description: "Latent fingerprint lifted from victim's mobile phone case using ninhydrin spray. Lift card #FL-004-2026. Partial print, approximately 60% clarity.", collectedAt: '2026-09-02T20:30:00.000Z', collectedLocation: 'Crime Scene A, Koramangala, Bengaluru', collectedBy: 'Constable Ravi', currentCustodian: 'FSL Officer Subramaniam', currentLocation: 'FSL Bengaluru, Lab 2', status: 'At FSL', integrityStatus: 'VERIFIED', forensicStatus: 'Under Examination', sha256Hash: 'f19c2d8e5a4b73c6e291a08d47f3b6c9e2a58d1f730b4c9e8f25a1d47b6c3e90', blockchainTxId: 'TX-8F21A4D5', blockchainVerified: true, sealId: 'SEAL-9823', notes: 'FSL transfer acknowledged after delay; alert raised. Examination currently in progress at FSL Bengaluru.' },
  { evidenceId: 'EV-0145', caseFir: 'FIR 142/2026', type: 'Blood Sample', enumType: 'PHYSICAL', description: 'Blood sample collected from crime scene floor using sterile swab kit. Sample volume approx. 5ml. Stored in sealed biohazard container at 4°C during transit.', collectedAt: '2026-09-02T19:45:00.000Z', collectedLocation: 'Crime Scene A, Koramangala, Bengaluru', collectedBy: 'SI Arun Kumar', currentCustodian: 'FSL Officer Subramaniam', currentLocation: 'FSL Bengaluru, Serology Lab', status: 'At FSL', integrityStatus: 'VERIFIED', forensicStatus: 'Report Available', sha256Hash: 'e47b3c9d1a8f52e7b304c91a58d27b3f6c9e2a1d48b75c3e90f1a2d47b6c3e91', blockchainTxId: 'TX-8F21A4E8', blockchainVerified: true, sealId: 'SEAL-9824', notes: 'DNA profile extracted. Serology report filed. Blood type matched. Full FSL report available.' },
  { evidenceId: 'EV-0146', caseFir: 'FIR 142/2026', type: 'Written Statement', enumType: 'PDF', description: 'Handwritten statement by eyewitness Mr. K. Sridhar, 3 pages, dated 03-Sep-2026. Statement corroborates CCTV footage timeline. Witness signature and IO countersignature present.', collectedAt: '2026-09-03T10:00:00.000Z', collectedLocation: 'Koramangala PS, Statement Room', collectedBy: 'SI Arun Kumar', currentCustodian: 'Evidence Store Officer', currentLocation: 'Evidence Store Room B, Central PS', status: 'Secure Storage', integrityStatus: 'NOT_CHECKED', forensicStatus: 'Not Required', sha256Hash: 'b93f17cd4e28f0a5c73b9e41d268c4f9a18b573e20c41b9a6f47c8e3d21f09b5', blockchainTxId: 'TX-8F21A4F1', blockchainVerified: true, sealId: null, notes: 'Document evidence. Forensic examination not required. Stored in sealed manila envelope with case reference number.' },
  { evidenceId: 'EV-0147', caseFir: 'FIR 142/2026', type: 'CCTV Footage', enumType: 'VIDEO', description: "Footage from suspect's building entrance camera, MP4 format, H.264 encoded, covering 15:00–23:00 hrs on 02-Sep-2026. Retrieved from DVR.", collectedAt: '2026-09-03T14:20:00.000Z', collectedLocation: 'Apartment Complex, 8th Cross, Koramangala, Bengaluru', collectedBy: 'Constable Ravi', currentCustodian: 'Evidence Store Officer', currentLocation: 'Digital Evidence Server, Central PS', status: 'Secure Storage', integrityStatus: 'PENDING', forensicStatus: 'Pending Submission', sha256Hash: 'd25a8c4f1e7b3a9d60f2c5b8e3a7f14c9d28b5a1e7c3f9b4d6a20e5c8f1b3a74', blockchainTxId: 'TX-8F21A4G3', blockchainVerified: false, sealId: 'SEAL-9830', notes: 'Hash verification pending. FSL submission not yet initiated. Priority item for forensic examination.' },
  { evidenceId: 'EV-0148', caseFir: 'FIR 142/2026', type: 'Weapon', enumType: 'PHYSICAL', description: 'Kitchen knife, stainless steel, 20cm blade length, recovered from dustbin near crime scene. Potential trace blood on blade. Packaged in rigid evidence container.', collectedAt: '2026-09-02T21:05:00.000Z', collectedLocation: 'Municipal Dustbin, Near Crime Scene A, Koramangala', collectedBy: 'SI Arun Kumar', currentCustodian: 'FSL Officer Subramaniam', currentLocation: 'FSL Bengaluru, Trace Evidence Lab', status: 'At FSL', integrityStatus: 'VERIFIED', forensicStatus: 'Report Available', sha256Hash: 'c84b2a9e5f1d7c3b0e8a6f4d29c7b3e5a1d8f0c6b9e4a3d7f2c0b8e5a9d4c7f3', blockchainTxId: 'TX-8F21A4H7', blockchainVerified: true, sealId: 'SEAL-9825', notes: 'Serological analysis confirms victim blood group on blade. Fingerprint examination pending on handle.' },
  { evidenceId: 'EV-0149', caseFir: 'FIR 142/2026', type: 'Physical Sample', enumType: 'PHYSICAL', description: 'Soil sample from crime scene floor and near doorstep — 2 separate sealed containers. Trace evidence analysis requested.', collectedAt: '2026-09-02T20:55:00.000Z', collectedLocation: 'Crime Scene A, Koramangala, Bengaluru', collectedBy: 'Constable Ravi', currentCustodian: 'FSL Officer Subramaniam', currentLocation: 'FSL Bengaluru, Trace Evidence Lab', status: 'At FSL', integrityStatus: 'VERIFIED', forensicStatus: 'Examination Complete', sha256Hash: 'a91e3d7c5f2b0e8a6d4c2b9f7e3a5d1c8f6b4e2a0d8c6f4b2e0a8c6f4d2b0e8a', blockchainTxId: 'TX-8F21A4I9', blockchainVerified: true, sealId: 'SEAL-9826', notes: 'Soil composition analysis complete. Comparison with suspect premises sample ongoing.' },

  // ---- FIR 089/2026 ----
  { evidenceId: 'EV-0200', caseFir: 'FIR 089/2026', type: 'Stolen Goods', enumType: 'PHYSICAL', description: 'Gold jewellery items (6 pieces) recovered from accused — 2 necklaces, 3 bangles, 1 ring. Estimated value ₹3,20,000. Identified by complainant as stolen property.', collectedAt: '2026-07-15T14:00:00.000Z', collectedLocation: 'Accused Residence, BTM Layout, Bengaluru', collectedBy: 'DSP Priya Menon', currentCustodian: 'Evidence Store Officer', currentLocation: 'Koramangala PS Evidence Strong Room', status: 'Secure Storage', integrityStatus: 'VERIFIED', forensicStatus: 'Not Required', sha256Hash: 'f4b8e2a6c0d9f3b7e1a5c9d3b7f1e5a9c3d7f1b5e9a3c7d1f5b9e3a7c1d5f9b3', blockchainTxId: 'TX-9A11B001', blockchainVerified: true, sealId: 'SEAL-8901', notes: 'Items photographed and catalogued. Complainant identification statement obtained.' },
  { evidenceId: 'EV-0201', caseFir: 'FIR 089/2026', type: 'CCTV Footage', enumType: 'VIDEO', description: 'CCTV footage from complainant residence showing accused entering premises. Timestamp 2026-07-14T22:35:00. 45 minutes duration.', collectedAt: '2026-07-15T10:30:00.000Z', collectedLocation: 'Complainant Residence, 12th Main, Koramangala', collectedBy: 'DSP Priya Menon', currentCustodian: 'Evidence Store Officer', currentLocation: 'Digital Evidence Server, Koramangala PS', status: 'Secure Storage', integrityStatus: 'VERIFIED', forensicStatus: 'Report Available', sha256Hash: 'a3c7f1b5e9d4c8f2b6e0a4c8d2f6b0e4a8c2d6f0b4e8a2c6d0f4b8e2a6c0d4f8', blockchainTxId: 'TX-9A11B002', blockchainVerified: true, sealId: null, notes: 'Facial recognition analysis confirms accused. Transfer to FSL acknowledged. Report received.' },
  { evidenceId: 'EV-0202', caseFir: 'FIR 089/2026', type: 'Fingerprint Lift', enumType: 'PHYSICAL', description: 'Fingerprint lifts from window latch (point of entry). 3 latent prints of good quality collected. Matched to accused fingerprint record.', collectedAt: '2026-07-15T12:00:00.000Z', collectedLocation: 'Complainant Residence, Window Frame, 12th Main, Koramangala', collectedBy: 'DSP Priya Menon', currentCustodian: 'Evidence Store Officer', currentLocation: 'Koramangala PS Evidence Store', status: 'Secure Storage', integrityStatus: 'VERIFIED', forensicStatus: 'Report Available', sha256Hash: 'b5d9e3a7c1f5b9e3a7c1d5f9b3e7a1c5d9f3b7e1a5c9d3f7b1e5a9c3f7d1b5e9', blockchainTxId: 'TX-9A11B003', blockchainVerified: true, sealId: 'SEAL-8902', notes: 'AFIS match confirmed accused identity. Report on file.' },
  { evidenceId: 'EV-0203', caseFir: 'FIR 089/2026', type: 'Accused Clothing', enumType: 'PHYSICAL', description: "Clothing worn by accused at time of arrest — blue denim shirt and black trousers. Submitted for trace evidence comparison with complainant's residence.", collectedAt: '2026-07-15T15:45:00.000Z', collectedLocation: 'Koramangala PS, Arrest Spot', collectedBy: 'DSP Priya Menon', currentCustodian: 'Evidence Store Officer', currentLocation: 'Koramangala PS Evidence Store', status: 'Secure Storage', integrityStatus: 'VERIFIED', forensicStatus: 'Report Available', sha256Hash: 'c7f1b5e9a3d7f1b5e9a3c7d1f5b9e3a7c1d5f9b3e7a1c5d9f3b7e1a5c9d3f7b1', blockchainTxId: 'TX-9A11B004', blockchainVerified: true, sealId: 'SEAL-8903', notes: 'Trace soil matching crime scene found on trouser cuff. Report verified.' },

  // ---- FIR 201/2026 ----
  { evidenceId: 'EV-0300', caseFir: 'FIR 201/2026', type: 'Mobile Device', enumType: 'DISK_IMAGE', description: 'iPhone 14 Pro, black, recovered from accused Pradeep Sharma during raid. Contains suspected fraudulent UPI transaction records. Stored in Faraday bag.', collectedAt: '2026-09-08T15:30:00.000Z', collectedLocation: 'Accused Flat, HSR Layout, Sector 4, Bengaluru', collectedBy: 'SI Vikram Nair', currentCustodian: 'FSL Officer Subramaniam', currentLocation: 'FSL Bengaluru, Cyber Forensics Lab', status: 'At FSL', integrityStatus: 'VERIFIED', forensicStatus: 'Under Examination', sha256Hash: 'd9f3b7e1a5c9d3f7b1e5a9c3d7f1b5e9a3c7d1f5b9e3a7c1d5f9b3e7a1c5d9f3', blockchainTxId: 'TX-7C34D001', blockchainVerified: true, sealId: 'SEAL-2011', notes: 'Stored in Faraday cage at all times to prevent remote wipe. Passcode extraction attempted; pending FSL analysis.' },
  { evidenceId: 'EV-0301', caseFir: 'FIR 201/2026', type: 'Laptop Computer', enumType: 'DISK_IMAGE', description: 'Dell Inspiron 15 laptop, silver, S/N: CN0AB1234567. Contains spreadsheets and email records related to suspected fraudulent transactions worth ₹2.4 crore.', collectedAt: '2026-09-08T15:45:00.000Z', collectedLocation: 'Accused Flat, HSR Layout, Sector 4, Bengaluru', collectedBy: 'SI Vikram Nair', currentCustodian: 'FSL Officer Subramaniam', currentLocation: 'FSL Bengaluru, Cyber Forensics Lab', status: 'At FSL', integrityStatus: 'VERIFIED', forensicStatus: 'Under Examination', sha256Hash: 'e1a5c9d3f7b1e5a9c3d7f1b5e9a3c7d1f5b9e3a7c1d5f9b3e7a1c5d9f3b7e1a5', blockchainTxId: 'TX-7C34D002', blockchainVerified: true, sealId: 'SEAL-2012', notes: 'Bit-by-bit forensic image taken before examination. Original hard drive sealed separately.' },
  // EV-0310 is named in alert ALT-004 ("Forensic Report Overdue"); registered
  // here so that alert references a real row rather than a dangling id.
  { evidenceId: 'EV-0310', caseFir: 'FIR 201/2026', type: 'Mobile Device', enumType: 'DISK_IMAGE', description: 'Samsung Galaxy A54 seized from second accused. Contains SIM cards registered on forged identity documents.', collectedAt: '2026-09-09T09:20:00.000Z', collectedLocation: 'Accused Flat, HSR Layout, Sector 4, Bengaluru', collectedBy: 'SI Vikram Nair', currentCustodian: 'FSL Officer Subramaniam', currentLocation: 'FSL Bengaluru, Cyber Forensics Lab', status: 'At FSL', integrityStatus: 'VERIFIED', forensicStatus: 'Under Examination', sha256Hash: 'b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2c6e0b4d8f2a6c0e4b8d2f6a0c4e8b2d6', blockchainTxId: 'TX-7C34D010', blockchainVerified: true, sealId: 'SEAL-2013', notes: 'Expected forensic completion date exceeded. Follow-up with FSL Bengaluru pending.' },
  { evidenceId: 'EV-0312', caseFir: 'FIR 201/2026', type: 'Bank Documents', enumType: 'PDF', description: 'Forged bank statements and identity documents — 12 pages. Suspected fabrication of Aadhaar and PAN cards for multiple identities.', collectedAt: '2026-09-09T11:00:00.000Z', collectedLocation: 'HSR Layout PS, Seized from accused associate', collectedBy: 'Constable K. Bharat', currentCustodian: 'Evidence Store Officer', currentLocation: 'HSR Layout PS Evidence Store', status: 'Secure Storage', integrityStatus: 'PENDING', forensicStatus: 'Pending Submission', sha256Hash: 'f3b7e1a5c9d3f7b1e5a9c3d7f1b5e9a3c7d1f5b9e3a7c1d5f9b3e7a1c5d9f3b7', blockchainTxId: 'TX-7C34D012', blockchainVerified: false, sealId: null, notes: 'Receipt logged without matching dispatch event. Alert raised. Integrity check pending. Document examiner referral requested.' },

  // ---- FIR 215/2026 ----
  // EV-0215 is the integrity-mismatch exhibit referenced by alert ALT-001.
  // It was previously fabricated inline in the dashboard when not found;
  // it is now a real row so the exception is backed by data.
  { evidenceId: 'EV-0215', caseFir: 'FIR 215/2026', type: 'Corporate Server Log Archive', enumType: 'DISK_IMAGE', description: 'Seized server log file from target financial system. Discrepancy noted during periodic ledger audit.', collectedAt: '2026-09-10T16:30:00.000Z', collectedLocation: 'Electronic City PS Evidence Room', collectedBy: 'SI Mohan Das', currentCustodian: 'Evidence Store Officer', currentLocation: 'Secure Digital Storage #3', status: 'Secure Storage', integrityStatus: 'COMPROMISED', forensicStatus: 'Under Examination', sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', blockchainTxId: 'TX-9B101C88', blockchainVerified: false, sealId: 'SEAL-4491', notes: 'SHA-256 mismatch against ledger anchor. Chain-of-custody exception raised; internal review initiated.' },
];

// ---------------------------------------------------------------------------
// FORENSIC RECORDS — one per evidence item that is in the FSL pipeline.
// ---------------------------------------------------------------------------
const FORENSIC_RECORDS = [
  { evidenceId: 'EV-0142', fslRef: 'FSL-BLR-2026-4421', fslName: 'FSL Bengaluru', submittedDate: '2026-09-03T09:15:00.000Z', receivedDate: '2026-09-03T11:42:00.000Z', examinationStartDate: '2026-09-04T14:30:00.000Z', expectedCompletionDate: '2026-09-11T17:00:00.000Z', completionDate: '2026-09-10T16:00:00.000Z', examinationStatus: 'Report Available', reportHash: 'f8a2c6d9b3e7a1c5f9d3b7e1a5c9d3f7b1e5a9c3f7d1b5e9a3c7f1b5e9d3c7f1', reportBlockchainTxId: 'TX-8F21A008', reportBlockchainVerified: true, examiner: 'Dr. Anitha Krishnan', findings: 'Forensic imaging of device storage recovered 1,204 call records, 847 SMS messages, 23 deleted WhatsApp conversations, and 312 photographs. Key contact identified as suspect. GPS metadata from photographs places device at crime scene on 02-Sep-2026 at 18:10 hrs. Full report submitted to IO.' },
  { evidenceId: 'EV-0143', fslRef: 'FSL-BLR-2026-4422', fslName: 'FSL Bengaluru', submittedDate: '2026-09-03T09:00:00.000Z', receivedDate: '2026-09-04T10:00:00.000Z', examinationStartDate: '2026-09-05T09:30:00.000Z', expectedCompletionDate: '2026-09-13T17:00:00.000Z', completionDate: '2026-09-12T15:00:00.000Z', examinationStatus: 'Report Available', reportHash: 'a1b5c9d3e7f1a5b9c3d7e1f5a9b3c7d1e5f9a3b7c1d5e9f3a7b1c5d9e3f7a1b5', reportBlockchainTxId: 'TX-8F21B010', reportBlockchainVerified: true, examiner: 'Dr. Ramesh Bhat', findings: 'CCTV footage analysis confirmed individual matching suspect description entering ATM premises at 18:22 hrs on 02-Sep-2026. Facial biometric comparison performed. Report with enhanced stills submitted.' },
  { evidenceId: 'EV-0144', fslRef: 'FSL-BLR-2026-4435', fslName: 'FSL Bengaluru', submittedDate: '2026-09-04T08:30:00.000Z', receivedDate: '2026-09-04T11:15:00.000Z', examinationStartDate: '2026-09-07T10:00:00.000Z', expectedCompletionDate: '2026-09-14T17:00:00.000Z', completionDate: null, examinationStatus: 'Under Examination', reportHash: null, reportBlockchainTxId: null, reportBlockchainVerified: false, examiner: 'Dr. Sunitha Rao', findings: null },
  { evidenceId: 'EV-0145', fslRef: 'FSL-BLR-2026-4423', fslName: 'FSL Bengaluru', submittedDate: '2026-09-03T09:15:00.000Z', receivedDate: '2026-09-03T11:45:00.000Z', examinationStartDate: '2026-09-03T14:00:00.000Z', expectedCompletionDate: '2026-09-09T17:00:00.000Z', completionDate: '2026-09-08T16:30:00.000Z', examinationStatus: 'Report Available', reportHash: 'c3d7f1b5e9a3c7d1f5b9e3a7c1d5f9b3e7a1c5d9f3b7e1a5c9d3f7b1e5a9c3d7', reportBlockchainTxId: 'TX-8F21D001', reportBlockchainVerified: true, examiner: 'Dr. Lakshmi Prasad', findings: 'DNA profiling complete. Blood group O+. DNA profile extracted and loaded into NDNAD. Comparison with suspect DNA sample pending accused apprehension.' },
  { evidenceId: 'EV-0147', fslRef: '', fslName: 'FSL Bengaluru', submittedDate: null, receivedDate: null, examinationStartDate: null, expectedCompletionDate: null, completionDate: null, examinationStatus: 'Pending Submission', reportHash: null, reportBlockchainTxId: null, reportBlockchainVerified: false, examiner: null, findings: null },
  // Derived from each exhibit's forensicStatus so per-case forensic progress
  // computes correctly instead of under-reporting.
  { evidenceId: 'EV-0148', fslRef: 'FSL-BLR-2026-4424', fslName: 'FSL Bengaluru', submittedDate: '2026-09-03T09:20:00.000Z', receivedDate: '2026-09-03T12:05:00.000Z', examinationStartDate: '2026-09-04T09:00:00.000Z', expectedCompletionDate: '2026-09-12T17:00:00.000Z', completionDate: '2026-09-11T14:00:00.000Z', examinationStatus: 'Report Available', reportHash: 'd4e8a2c6f0b4d8e2a6c0f4b8d2e6a0c4f8b2d6e0a4c8f2b6d0e4a8c2f6b0d4e8', reportBlockchainTxId: 'TX-8F21H010', reportBlockchainVerified: true, examiner: 'Dr. Lakshmi Prasad', findings: 'Serological analysis confirms victim blood group on blade. Fingerprint examination on handle pending.' },
  { evidenceId: 'EV-0149', fslRef: 'FSL-BLR-2026-4425', fslName: 'FSL Bengaluru', submittedDate: '2026-09-03T09:25:00.000Z', receivedDate: '2026-09-03T12:10:00.000Z', examinationStartDate: '2026-09-05T10:00:00.000Z', expectedCompletionDate: '2026-09-15T17:00:00.000Z', completionDate: '2026-09-14T11:30:00.000Z', examinationStatus: 'Examination Complete', reportHash: null, reportBlockchainTxId: null, reportBlockchainVerified: false, examiner: 'Dr. Sunitha Rao', findings: 'Soil composition analysis complete. Comparison with suspect premises sample ongoing.' },
  { evidenceId: 'EV-0201', fslRef: 'FSL-BLR-2026-3310', fslName: 'FSL Bengaluru', submittedDate: '2026-07-16T09:00:00.000Z', receivedDate: '2026-07-16T13:00:00.000Z', examinationStartDate: '2026-07-18T10:00:00.000Z', expectedCompletionDate: '2026-07-30T17:00:00.000Z', completionDate: '2026-07-28T15:00:00.000Z', examinationStatus: 'Report Available', reportHash: 'b6c0d4e8f2a6b0c4d8e2f6a0b4c8d2e6f0a4b8c2d6e0f4a8b2c6d0e4f8a2b6c0', reportBlockchainTxId: 'TX-9A11B010', reportBlockchainVerified: true, examiner: 'Dr. Ramesh Bhat', findings: 'Facial recognition analysis confirms accused identity in footage. Enhanced stills appended.' },
  { evidenceId: 'EV-0202', fslRef: 'FSL-BLR-2026-3311', fslName: 'FSL Bengaluru', submittedDate: '2026-07-16T09:05:00.000Z', receivedDate: '2026-07-16T13:05:00.000Z', examinationStartDate: '2026-07-18T11:00:00.000Z', expectedCompletionDate: '2026-07-29T17:00:00.000Z', completionDate: '2026-07-27T16:00:00.000Z', examinationStatus: 'Report Available', reportHash: 'c8d2e6f0a4b8c2d6e0f4a8b2c6d0e4f8a2b6c0d4e8f2a6b0c4d8e2f6a0b4c8d2', reportBlockchainTxId: 'TX-9A11B011', reportBlockchainVerified: true, examiner: 'Dr. Lakshmi Prasad', findings: 'AFIS comparison returned a confirmed match to the accused fingerprint record.' },
  { evidenceId: 'EV-0203', fslRef: 'FSL-BLR-2026-3312', fslName: 'FSL Bengaluru', submittedDate: '2026-07-16T09:10:00.000Z', receivedDate: '2026-07-16T13:10:00.000Z', examinationStartDate: '2026-07-19T09:30:00.000Z', expectedCompletionDate: '2026-07-31T17:00:00.000Z', completionDate: '2026-07-30T12:00:00.000Z', examinationStatus: 'Report Available', reportHash: 'e0f4a8b2c6d0e4f8a2b6c0d4e8f2a6b0c4d8e2f6a0b4c8d2e6f0a4b8c2d6e0f4', reportBlockchainTxId: 'TX-9A11B012', reportBlockchainVerified: true, examiner: 'Dr. Sunitha Rao', findings: 'Trace soil recovered from trouser cuff is consistent with crime scene sample.' },
  { evidenceId: 'EV-0300', fslRef: 'FSL-BLR-2026-5501', fslName: 'FSL Bengaluru', submittedDate: '2026-09-09T10:00:00.000Z', receivedDate: '2026-09-09T15:30:00.000Z', examinationStartDate: '2026-09-10T09:00:00.000Z', expectedCompletionDate: '2026-09-14T17:00:00.000Z', completionDate: null, examinationStatus: 'Under Examination', reportHash: null, reportBlockchainTxId: null, reportBlockchainVerified: false, examiner: 'Dr. Anitha Krishnan', findings: null },
  { evidenceId: 'EV-0301', fslRef: 'FSL-BLR-2026-5502', fslName: 'FSL Bengaluru', submittedDate: '2026-09-09T10:05:00.000Z', receivedDate: '2026-09-09T15:35:00.000Z', examinationStartDate: '2026-09-10T09:30:00.000Z', expectedCompletionDate: '2026-09-14T17:00:00.000Z', completionDate: null, examinationStatus: 'Under Examination', reportHash: null, reportBlockchainTxId: null, reportBlockchainVerified: false, examiner: 'Dr. Anitha Krishnan', findings: null },
  { evidenceId: 'EV-0310', fslRef: 'FSL-BLR-2026-5510', fslName: 'FSL Bengaluru', submittedDate: '2026-09-09T11:00:00.000Z', receivedDate: '2026-09-09T16:00:00.000Z', examinationStartDate: '2026-09-10T10:00:00.000Z', expectedCompletionDate: '2026-09-14T17:00:00.000Z', completionDate: null, examinationStatus: 'Under Examination', reportHash: null, reportBlockchainTxId: null, reportBlockchainVerified: false, examiner: 'Dr. Ramesh Bhat', findings: null },
  { evidenceId: 'EV-0312', fslRef: '', fslName: 'FSL Bengaluru', submittedDate: null, receivedDate: null, examinationStartDate: null, expectedCompletionDate: null, completionDate: null, examinationStatus: 'Pending Submission', reportHash: null, reportBlockchainTxId: null, reportBlockchainVerified: false, examiner: null, findings: null },
  { evidenceId: 'EV-0215', fslRef: 'FSL-BLR-2026-6001', fslName: 'FSL Bengaluru', submittedDate: '2026-09-11T09:00:00.000Z', receivedDate: '2026-09-11T14:00:00.000Z', examinationStartDate: '2026-09-12T09:00:00.000Z', expectedCompletionDate: '2026-09-20T17:00:00.000Z', completionDate: null, examinationStatus: 'Under Examination', reportHash: null, reportBlockchainTxId: null, reportBlockchainVerified: false, examiner: 'Dr. Suresh Kumar', findings: null },
];

// ---------------------------------------------------------------------------
// CUSTODY EVENTS — append-only chain-of-custody timeline.
// ---------------------------------------------------------------------------
const CUSTODY_EVENTS = [
  // ---- EV-0142 ----
  { id: 'CE-0001', evidenceId: 'EV-0142', timestamp: '2026-09-02T18:32:00.000Z', eventType: 'Evidence Collected', actor: 'SI Arun Kumar', toCustodian: 'SI Arun Kumar', location: 'Crime Scene A, Koramangala, Bengaluru', txId: 'TX-8F21A001', blockchainVerified: true, notes: 'Mobile device collected in switched-off condition. Placed in anti-static evidence bag.' },
  { id: 'CE-0002', evidenceId: 'EV-0142', timestamp: '2026-09-02T18:45:00.000Z', eventType: 'Evidence Sealed', actor: 'SI Arun Kumar', location: 'Crime Scene A, Koramangala, Bengaluru', txId: 'TX-8F21A002', blockchainVerified: true, sealId: 'SEAL-9821', notes: 'Evidence sealed with tamper-evident seal. Seal number recorded and photographed.' },
  { id: 'CE-0003', evidenceId: 'EV-0142', timestamp: '2026-09-02T19:20:00.000Z', eventType: 'Custody Transferred', actor: 'SI Arun Kumar', fromCustodian: 'SI Arun Kumar', toCustodian: 'Constable Ravi', location: 'Koramangala PS', txId: 'TX-8F21A003', blockchainVerified: true, notes: 'Transfer for escort to Central PS Evidence Store. Seal integrity confirmed prior to transfer.' },
  { id: 'CE-0004', evidenceId: 'EV-0142', timestamp: '2026-09-02T20:05:00.000Z', eventType: 'Custody Received', actor: 'Constable Ravi', fromCustodian: 'SI Arun Kumar', toCustodian: 'Constable Ravi', location: 'Koramangala PS', txId: 'TX-8F21A004', blockchainVerified: true, notes: 'Receipt acknowledged. Seal SEAL-9821 intact. Evidence logged in register.' },
  { id: 'CE-0005', evidenceId: 'EV-0142', timestamp: '2026-09-03T09:15:00.000Z', eventType: 'Transferred to FSL', actor: 'Constable Ravi', fromCustodian: 'Constable Ravi', toCustodian: 'FSL Bengaluru', location: 'Central PS Evidence Store, Bengaluru', txId: 'TX-8F21A005', blockchainVerified: true, notes: 'Dispatched to FSL Bengaluru under Requisition No. FSL-REQ-2026-4421. Seal intact.' },
  { id: 'CE-0006', evidenceId: 'EV-0142', timestamp: '2026-09-03T11:42:00.000Z', eventType: 'Received by FSL', actor: 'FSL Officer Subramaniam', fromCustodian: 'Constable Ravi', toCustodian: 'FSL Officer Subramaniam', location: 'FSL Bengaluru, Lab 3', txId: 'TX-8F21A006', blockchainVerified: true, notes: 'Received and logged. Seal SEAL-9821 verified intact. Assigned for digital forensics examination.' },
  { id: 'CE-0007', evidenceId: 'EV-0142', timestamp: '2026-09-04T14:30:00.000Z', eventType: 'Forensic Examination Started', actor: 'Dr. Anitha Krishnan', location: 'FSL Bengaluru, Lab 3', txId: 'TX-8F21A007', blockchainVerified: true, notes: 'Digital forensics examination commenced. Forensic imaging of device storage initiated.' },
  { id: 'CE-0008', evidenceId: 'EV-0142', timestamp: '2026-09-10T16:00:00.000Z', eventType: 'Forensic Report Filed', actor: 'Dr. Anitha Krishnan', location: 'FSL Bengaluru', txId: 'TX-8F21A008', blockchainVerified: true, notes: 'Forensic examination complete. Detailed report filed under FSL-BLR-2026-4421. Call logs, messages, and deleted data recovered.' },

  // ---- EV-0143 ----
  { id: 'CE-0010', evidenceId: 'EV-0143', timestamp: '2026-09-02T19:15:00.000Z', eventType: 'Evidence Collected', actor: 'SI Arun Kumar', toCustodian: 'SI Arun Kumar', location: 'ATM Branch, 5th Block, Koramangala, Bengaluru', txId: 'TX-8F21B001', blockchainVerified: true, notes: 'Video footage copied to encrypted USB drive. Hash computed at source.' },
  { id: 'CE-0011', evidenceId: 'EV-0143', timestamp: '2026-09-02T19:30:00.000Z', eventType: 'Evidence Sealed', actor: 'SI Arun Kumar', location: 'ATM Branch, 5th Block, Koramangala, Bengaluru', txId: 'TX-8F21B002', blockchainVerified: true, sealId: 'SEAL-9822', notes: 'USB drive placed in tamper-evident bag and sealed.' },
  { id: 'CE-0012', evidenceId: 'EV-0143', timestamp: '2026-09-02T21:00:00.000Z', eventType: 'Custody Transferred', actor: 'SI Arun Kumar', fromCustodian: 'SI Arun Kumar', toCustodian: 'Evidence Store Officer', location: 'Central PS Evidence Store, Bengaluru', txId: 'TX-8F21B003', blockchainVerified: true, notes: 'Transferred to Central PS Digital Evidence Server for secure storage.' },
  { id: 'CE-0013', evidenceId: 'EV-0143', timestamp: '2026-09-03T09:00:00.000Z', eventType: 'Transferred to FSL', actor: 'Evidence Store Officer', fromCustodian: 'Evidence Store Officer', toCustodian: 'FSL Bengaluru', location: 'Central PS Evidence Store, Bengaluru', txId: 'TX-8F21B004', blockchainVerified: true, notes: 'Digital copy transferred to FSL via secure encrypted channel. FSL requisition FSL-BLR-2026-4422 raised.' },

  // ---- EV-0144 ----
  { id: 'CE-0020', evidenceId: 'EV-0144', timestamp: '2026-09-02T20:30:00.000Z', eventType: 'Evidence Collected', actor: 'Constable Ravi', toCustodian: 'Constable Ravi', location: 'Crime Scene A, Koramangala, Bengaluru', txId: 'TX-8F21C001', blockchainVerified: true, notes: 'Fingerprint lift collected using ninhydrin spray. Lift card labelled and photographed.' },
  { id: 'CE-0021', evidenceId: 'EV-0144', timestamp: '2026-09-02T20:45:00.000Z', eventType: 'Evidence Sealed', actor: 'Constable Ravi', location: 'Crime Scene A, Koramangala, Bengaluru', txId: 'TX-8F21C002', blockchainVerified: true, sealId: 'SEAL-9823', notes: 'Lift card placed in protective sleeve and sealed.' },
  { id: 'CE-0022', evidenceId: 'EV-0144', timestamp: '2026-09-02T21:30:00.000Z', eventType: 'Custody Transferred', actor: 'Constable Ravi', fromCustodian: 'Constable Ravi', toCustodian: 'Evidence Store Officer', location: 'Koramangala PS', txId: 'TX-8F21C003', blockchainVerified: true, notes: 'Transferred to PS evidence store overnight before FSL dispatch.' },
  { id: 'CE-0023', evidenceId: 'EV-0144', timestamp: '2026-09-04T08:30:00.000Z', eventType: 'Transferred to FSL', actor: 'Evidence Store Officer', fromCustodian: 'Evidence Store Officer', toCustodian: 'FSL Bengaluru', location: 'Central PS Evidence Store, Bengaluru', txId: 'TX-8F21C004', blockchainVerified: true, notes: 'Dispatched under FSL-REQ-2026-4435. Alert raised for delayed acknowledgement.' },
  { id: 'CE-0024', evidenceId: 'EV-0144', timestamp: '2026-09-04T11:15:00.000Z', eventType: 'Received by FSL', actor: 'FSL Officer Subramaniam', fromCustodian: 'Evidence Store Officer', toCustodian: 'FSL Officer Subramaniam', location: 'FSL Bengaluru, Lab 2', txId: 'TX-8F21C005', blockchainVerified: true, notes: 'Receipt confirmed after 12-hour delay. Seal SEAL-9823 intact. AFIS examination queued.' },

  // ---- EV-0215 (integrity exception) ----
  { id: 'CE-0030', evidenceId: 'EV-0215', timestamp: '2026-09-10T16:30:00.000Z', eventType: 'Evidence Collected', actor: 'SI Mohan Das', toCustodian: 'SI Mohan Das', location: 'Electronic City PS Evidence Room', txId: 'TX-9B101C01', blockchainVerified: true, notes: 'Server log archive exported and hashed at source.' },
  { id: 'CE-0031', evidenceId: 'EV-0215', timestamp: '2026-09-10T17:00:00.000Z', eventType: 'Evidence Sealed', actor: 'SI Mohan Das', location: 'Electronic City PS Evidence Room', txId: 'TX-9B101C02', blockchainVerified: true, sealId: 'SEAL-4491', notes: 'Archive written to write-once media and sealed.' },
  { id: 'CE-0032', evidenceId: 'EV-0215', timestamp: '2026-09-16T08:15:00.000Z', eventType: 'Custody Received', actor: 'Evidence Store Officer', fromCustodian: 'SI Mohan Das', toCustodian: 'Evidence Store Officer', location: 'Secure Digital Storage #3', txId: 'TX-9B101C88', blockchainVerified: false, notes: 'Periodic ledger audit detected SHA-256 mismatch against the anchored hash. Exception raised.' },
];

// ---------------------------------------------------------------------------
// ALERTS
// ---------------------------------------------------------------------------
const ALERTS = [
  { id: 'ALT-001', severity: 'critical', type: 'Integrity Mismatch', caseFir: 'FIR 215/2026', evidenceId: 'EV-0215', title: 'Integrity Mismatch Detected', description: 'SHA-256 hash of EV-0215 does not match ledger record. Current hash differs in 4 trailing characters. Possible evidence tampering or file corruption. Immediate verification required.', timestamp: '2026-09-16T08:15:00.000Z', status: 'Open' },
  { id: 'ALT-002', severity: 'critical', type: 'Unauthorized Access', caseFir: 'FIR 178/2026', evidenceId: null, title: 'Unauthorized Evidence Access Attempt', description: 'Unauthorized modification attempt detected on evidence records for FIR 178/2026. Access from unregistered terminal at 03:47 hrs. Three failed authentication attempts before access log was triggered.', timestamp: '2026-09-16T03:47:00.000Z', status: 'Open' },
  { id: 'ALT-003', severity: 'warning', type: 'Transfer Unacknowledged', caseFir: 'FIR 142/2026', evidenceId: 'EV-0144', title: 'Transfer Awaiting Acknowledgement', description: 'FSL transfer of EV-0144 (Fingerprint Lift) has not been acknowledged for over 12 hours. Transferred on 04-Sep-2026 at 08:30. IO should follow up with FSL Bengaluru to confirm receipt.', timestamp: '2026-09-04T20:30:00.000Z', status: 'Open' },
  { id: 'ALT-004', severity: 'warning', type: 'Forensic Overdue', caseFir: 'FIR 201/2026', evidenceId: null, title: 'Forensic Report Overdue', description: '3 evidence items for FIR 201/2026 have exceeded expected forensic completion date. Items: EV-0300, EV-0301, EV-0310. Expected completion was 2026-09-14. Contact FSL Bengaluru for status update.', timestamp: '2026-09-15T09:00:00.000Z', status: 'Open' },
  { id: 'ALT-005', severity: 'warning', type: 'Chain of Custody Exception', caseFir: 'FIR 201/2026', evidenceId: 'EV-0312', title: 'Evidence Received Without Dispatch Event', description: 'EV-0312 (Bank Documents) was logged as received at HSR Layout PS Evidence Store without a corresponding dispatch event. Chain-of-custody gap detected. Review and reconcile custody records.', timestamp: '2026-09-09T13:00:00.000Z', status: 'Acknowledged' },
  { id: 'ALT-006', severity: 'info', type: 'Forensic Report', caseFir: 'FIR 142/2026', evidenceId: 'EV-0142', title: 'Forensic Report Available', description: 'Forensic examination report for EV-0142 (Mobile Device) has been filed by Dr. Anitha Krishnan at FSL Bengaluru. Report verified on blockchain (TX-8F21A008). Report available for IO review.', timestamp: '2026-09-10T16:00:00.000Z', status: 'Resolved' },
  { id: 'ALT-007', severity: 'info', type: 'Transfer Acknowledged', caseFir: 'FIR 089/2026', evidenceId: 'EV-0201', title: 'Evidence Successfully Transferred', description: 'Transfer of EV-0201 (CCTV Footage) for FIR 089/2026 acknowledged by receiving custodian. Chain-of-custody intact. Blockchain verification successful.', timestamp: '2026-09-12T10:30:00.000Z', status: 'Resolved' },
];

// ---------------------------------------------------------------------------
// AUDIT EVENTS
// ---------------------------------------------------------------------------
const AUDIT_EVENTS = [
  { timestamp: '2026-09-02T10:00:00.000Z', user: 'SI Arun Kumar', action: 'User Login', evidenceId: null, caseFir: null, txId: 'TX-8F21AA01', verificationStatus: 'Verified', details: 'Successful login from PS terminal. Session initiated for FIR 142/2026 investigation.', role: 'POLICE' },
  { timestamp: '2026-09-02T18:35:00.000Z', user: 'SI Arun Kumar', action: 'Evidence Registered', evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA02', verificationStatus: 'Verified', details: 'Mobile device EV-0142 registered in system. SHA-256 hash computed and recorded on blockchain.', role: 'POLICE' },
  { timestamp: '2026-09-02T18:48:00.000Z', user: 'SI Arun Kumar', action: 'Evidence Sealed', evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA03', verificationStatus: 'Verified', details: 'Evidence EV-0142 sealed with SEAL-9821. Sealing event recorded on blockchain.', role: 'POLICE' },
  { timestamp: '2026-09-02T19:18:00.000Z', user: 'SI Arun Kumar', action: 'Evidence Registered', evidenceId: 'EV-0143', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA04', verificationStatus: 'Verified', details: 'CCTV footage EV-0143 registered. Digital evidence hash computed at collection site.', role: 'POLICE' },
  { timestamp: '2026-09-02T20:33:00.000Z', user: 'Constable Ravi', action: 'Evidence Registered', evidenceId: 'EV-0144', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA05', verificationStatus: 'Verified', details: 'Fingerprint lift EV-0144 registered. Collection details logged.', role: 'POLICE' },
  { timestamp: '2026-09-02T19:48:00.000Z', user: 'SI Arun Kumar', action: 'Evidence Registered', evidenceId: 'EV-0145', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA06', verificationStatus: 'Verified', details: 'Blood sample EV-0145 registered. Biohazard handling protocols recorded.', role: 'POLICE' },
  { timestamp: '2026-09-02T19:22:00.000Z', user: 'SI Arun Kumar', action: 'Custody Transfer Initiated', evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA07', verificationStatus: 'Verified', details: 'Custody of EV-0142 transferred from SI Arun Kumar to Constable Ravi for escort to PS Evidence Store.', role: 'POLICE' },
  { timestamp: '2026-09-02T20:07:00.000Z', user: 'Constable Ravi', action: 'Custody Receipt Acknowledged', evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA08', verificationStatus: 'Verified', details: 'Receipt of EV-0142 acknowledged by Constable Ravi. Seal SEAL-9821 integrity verified.', role: 'POLICE' },
  { timestamp: '2026-09-03T09:10:00.000Z', user: 'SI Arun Kumar', action: 'Evidence Registered', evidenceId: 'EV-0146', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA09', verificationStatus: 'Verified', details: 'Eyewitness written statement EV-0146 registered. Document stored in sealed envelope.', role: 'POLICE' },
  { timestamp: '2026-09-03T09:18:00.000Z', user: 'Evidence Store Officer', action: 'FSL Transfer Initiated', evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA10', verificationStatus: 'Verified', details: 'EV-0142 dispatched to FSL Bengaluru under requisition FSL-REQ-2026-4421. Seal verified before dispatch.', role: 'POLICE' },
  { timestamp: '2026-09-03T09:05:00.000Z', user: 'Evidence Store Officer', action: 'FSL Transfer Initiated', evidenceId: 'EV-0143', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA11', verificationStatus: 'Verified', details: 'EV-0143 digital evidence transferred to FSL via secure channel. FSL requisition FSL-BLR-2026-4422 created.', role: 'POLICE' },
  { timestamp: '2026-09-03T11:44:00.000Z', user: 'FSL Officer Subramaniam', action: 'FSL Receipt Confirmed', evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA12', verificationStatus: 'Verified', details: 'Receipt of EV-0142 confirmed by FSL Bengaluru. Logged under FSL-BLR-2026-4421.', role: 'FORENSICS' },
  { timestamp: '2026-09-03T14:25:00.000Z', user: 'Constable Ravi', action: 'Evidence Registered', evidenceId: 'EV-0147', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA13', verificationStatus: 'Pending', details: 'CCTV footage EV-0147 registered from apartment complex. Hash verification pending.', role: 'POLICE' },
  { timestamp: '2026-09-04T08:32:00.000Z', user: 'Evidence Store Officer', action: 'FSL Transfer Initiated', evidenceId: 'EV-0144', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA14', verificationStatus: 'Verified', details: 'EV-0144 dispatched to FSL Bengaluru under FSL-REQ-2026-4435. Alert pending for acknowledgement.', role: 'POLICE' },
  { timestamp: '2026-09-10T16:05:00.000Z', user: 'SI Arun Kumar', action: 'Forensic Report Viewed', evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA15', verificationStatus: 'Verified', details: 'IO accessed forensic report for EV-0142. Report hash verified against blockchain record TX-8F21A008.', role: 'POLICE' },
  { timestamp: '2026-09-10T16:10:00.000Z', user: 'SI Arun Kumar', action: 'Integrity Verification Run', evidenceId: 'EV-0142', caseFir: 'FIR 142/2026', txId: 'TX-8F21AA16', verificationStatus: 'Verified', details: 'Manual integrity verification run on EV-0142. Hash match confirmed. Blockchain record consistent.', role: 'POLICE' },
  { timestamp: '2026-09-15T14:22:00.000Z', user: 'SI Arun Kumar', action: 'Case Status Updated', evidenceId: null, caseFir: 'FIR 142/2026', txId: 'TX-8F21AA17', verificationStatus: 'Verified', details: 'Case status remains Under Investigation. Progress note added: awaiting FSL report for EV-0144.', role: 'POLICE' },
  { timestamp: '2026-09-16T08:00:00.000Z', user: 'SI Arun Kumar', action: 'User Login', evidenceId: null, caseFir: 'FIR 142/2026', txId: 'TX-8F21AA18', verificationStatus: 'Verified', details: 'Morning login. Dashboard accessed for FIR 142/2026 review.', role: 'POLICE' },
  { timestamp: '2026-09-16T08:16:00.000Z', user: 'SI Mohan Das', action: 'Integrity Verification Run', evidenceId: 'EV-0215', caseFir: 'FIR 215/2026', txId: 'TX-9B101C88', verificationStatus: 'Failed', details: 'Scheduled integrity sweep detected SHA-256 mismatch on EV-0215 against the anchored ledger hash. Alert ALT-001 raised.', role: 'POLICE' },
];

// Deterministic UUIDv5-style ids are overkill here; audit rows are keyed on a
// stable synthetic ref so re-running the seed updates rather than duplicates.
const auditRefFor = (i) => `SEED-AUD-${String(i + 1).padStart(3, '0')}`;

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------
async function main() {
  const purge = process.argv.includes('--purge');
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();

  console.log('\n=== NodeWatch DB — Development Data Seed ===\n');

  try {
    const seededCaseIds = CASES.map((c) => caseIdFor(c.firNumber));

    if (purge) {
      console.log('[purge] Removing previously seeded investigation rows...');
      await client.query(`DELETE FROM alerts WHERE alert_id = ANY($1)`, [ALERTS.map((a) => a.id)]);
      await client.query(`DELETE FROM custody_events WHERE case_id = ANY($1)`, [seededCaseIds]);
      await client.query(`DELETE FROM forensic_records WHERE case_id = ANY($1)`, [seededCaseIds]);
      await client.query(`DELETE FROM audit_logs WHERE case_id = ANY($1)`, [seededCaseIds]);
      await client.query(`DELETE FROM evidence_visibility WHERE evidence_id IN (SELECT evidence_id FROM evidence WHERE case_id = ANY($1))`, [seededCaseIds]);
      await client.query(`DELETE FROM evidence WHERE case_id = ANY($1)`, [seededCaseIds]);
      await client.query(`DELETE FROM cases WHERE case_id = ANY($1)`, [seededCaseIds]);
      console.log('[purge] Done.\n');
    }

    // ---- 1. Officers -----------------------------------------------------
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    for (const [userId, name, role, designation, badge] of OFFICERS) {
      const email = emailFor(name);
      await client.query(
        `INSERT INTO users (user_id, username, email, password_hash, name, role, designation,
                            badge_number, org_msp, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6::user_role,$7,$8,$9,TRUE,NOW(),NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           name = EXCLUDED.name, role = EXCLUDED.role,
           designation = EXCLUDED.designation, badge_number = EXCLUDED.badge_number,
           updated_at = NOW()`,
        [userId, email, email, passwordHash, name, role, designation, badge,
         role === 'FORENSICS' ? 'Org2MSP' : 'Org1MSP']
      );
    }
    console.log(`  Officers seeded:         ${OFFICERS.length} (password: ${SEED_PASSWORD})`);

    // ---- 2. Cases --------------------------------------------------------
    for (const c of CASES) {
      const caseId = caseIdFor(c.firNumber);
      const ioUserId = USER_ID_BY_NAME[c.investigatingOfficer] || null;
      await client.query(
        `INSERT INTO cases (case_id, title, description, status, location, incident_timestamp,
                            created_by_user_id, current_custodian_id, current_custodian_name,
                            blockchain_hash, version, is_deleted, created_at, updated_at,
                            fir_number, fir_date, police_station, district, state, case_type,
                            sections, investigating_officer, witness_count, coc_status, is_priority)
         VALUES ($1,$2,$3,$4::case_status,$5,$6,$7,$7,$8,'pending',1,FALSE,$6,$9,
                 $10,$6,$11,$12,'Karnataka',$13,$14::jsonb,$15,$16,$17,$18)
         ON CONFLICT (case_id) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description,
           status = EXCLUDED.status, location = EXCLUDED.location,
           current_custodian_id = EXCLUDED.current_custodian_id,
           current_custodian_name = EXCLUDED.current_custodian_name,
           fir_number = EXCLUDED.fir_number, fir_date = EXCLUDED.fir_date,
           police_station = EXCLUDED.police_station, district = EXCLUDED.district,
           case_type = EXCLUDED.case_type, sections = EXCLUDED.sections,
           investigating_officer = EXCLUDED.investigating_officer,
           witness_count = EXCLUDED.witness_count, coc_status = EXCLUDED.coc_status,
           is_priority = EXCLUDED.is_priority, updated_at = EXCLUDED.updated_at`,
        [caseId, c.title, c.description, c.status, `${c.policeStation}, ${c.district}`,
         c.dateRegistered, ioUserId, c.investigatingOfficer, c.lastUpdated,
         firNumberFor(c.firNumber), c.policeStation, c.district, c.caseType,
         JSON.stringify(c.offences), c.investigatingOfficer, c.witnessCount,
         c.cocStatus, c.isPriority]
      );
    }
    console.log(`  Cases seeded:            ${CASES.length}`);

    // ---- 3. Evidence -----------------------------------------------------
    for (const e of EVIDENCE) {
      const caseId = caseIdFor(e.caseFir);
      const custodianId = USER_ID_BY_NAME[e.currentCustodian] || null;
      const uploaderId = USER_ID_BY_NAME[e.collectedBy] || null;
      await client.query(
        `INSERT INTO evidence (evidence_id, case_id, name, file_name, type, category, description,
                               file_url, file_hash, metadata_hash, source_hash,
                               classification, risk_level, integrity_status, approved_for_legal,
                               notes, uploaded_by, collected_by_name, current_custodian_id,
                               current_custodian_name, current_location, storage_status,
                               forensic_status, owner_msp, collected_location, collected_timestamp,
                               linked_evidence_ids, blockchain_tx_id, blockchain_verified,
                               on_chain_status, seal_number, version, is_deleted, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5::evidence_type,$6,$7,'',$8,$8,$8,
                 'PRIMARY','LOW',$9::integrity_status,$10,
                 $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'[]'::jsonb,$22,$23,$24,$25,1,FALSE,$21,NOW())
         ON CONFLICT (evidence_id) DO UPDATE SET
           case_id = EXCLUDED.case_id, name = EXCLUDED.name, type = EXCLUDED.type,
           category = EXCLUDED.category, description = EXCLUDED.description,
           file_hash = EXCLUDED.file_hash, integrity_status = EXCLUDED.integrity_status,
           approved_for_legal = EXCLUDED.approved_for_legal, notes = EXCLUDED.notes,
           uploaded_by = EXCLUDED.uploaded_by, collected_by_name = EXCLUDED.collected_by_name,
           current_custodian_id = EXCLUDED.current_custodian_id,
           current_custodian_name = EXCLUDED.current_custodian_name,
           current_location = EXCLUDED.current_location, storage_status = EXCLUDED.storage_status,
           forensic_status = EXCLUDED.forensic_status,
           collected_location = EXCLUDED.collected_location,
           collected_timestamp = EXCLUDED.collected_timestamp,
           blockchain_tx_id = EXCLUDED.blockchain_tx_id,
           blockchain_verified = EXCLUDED.blockchain_verified,
           seal_number = EXCLUDED.seal_number, updated_at = NOW()`,
        [e.evidenceId, caseId, e.type, `${e.evidenceId}_${e.type.replace(/\s+/g, '_').toLowerCase()}`,
         e.enumType, e.type, e.description, e.sha256Hash, e.integrityStatus,
         e.integrityStatus === 'VERIFIED', e.notes, uploaderId, e.collectedBy, custodianId,
         e.currentCustodian, e.currentLocation, e.status, e.forensicStatus,
         custodianId && OFFICERS.find(([id]) => id === custodianId)?.[2] === 'FORENSICS' ? 'Org2MSP' : 'Org1MSP',
         e.collectedLocation, e.collectedAt, e.blockchainTxId, e.blockchainVerified,
         e.blockchainVerified ? 'CONFIRMED' : 'PENDING', e.sealId]
      );
      await client.query(
        `INSERT INTO evidence_visibility (evidence_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [e.evidenceId]
      );
    }
    console.log(`  Evidence seeded:         ${EVIDENCE.length}`);

    // ---- 4. Forensic records --------------------------------------------
    const caseFirByEvidence = EVIDENCE.reduce((acc, e) => {
      acc[e.evidenceId] = e.caseFir;
      return acc;
    }, {});
    for (const f of FORENSIC_RECORDS) {
      const caseId = caseIdFor(caseFirByEvidence[f.evidenceId]);
      await client.query(
        `INSERT INTO forensic_records (record_id, evidence_id, case_id, fsl_ref, fsl_name,
                                       submitted_date, received_date, examination_start_date,
                                       expected_completion_date, completion_date, examination_status,
                                       report_hash, report_blockchain_tx_id, report_blockchain_verified,
                                       examiner, findings, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
         ON CONFLICT (record_id) DO UPDATE SET
           fsl_ref = EXCLUDED.fsl_ref, fsl_name = EXCLUDED.fsl_name,
           submitted_date = EXCLUDED.submitted_date, received_date = EXCLUDED.received_date,
           examination_start_date = EXCLUDED.examination_start_date,
           expected_completion_date = EXCLUDED.expected_completion_date,
           completion_date = EXCLUDED.completion_date,
           examination_status = EXCLUDED.examination_status,
           report_hash = EXCLUDED.report_hash,
           report_blockchain_tx_id = EXCLUDED.report_blockchain_tx_id,
           report_blockchain_verified = EXCLUDED.report_blockchain_verified,
           examiner = EXCLUDED.examiner, findings = EXCLUDED.findings, updated_at = NOW()`,
        [`FR-${f.evidenceId}`, f.evidenceId, caseId, f.fslRef, f.fslName, f.submittedDate,
         f.receivedDate, f.examinationStartDate, f.expectedCompletionDate, f.completionDate,
         f.examinationStatus, f.reportHash, f.reportBlockchainTxId, f.reportBlockchainVerified,
         f.examiner, f.findings]
      );
    }
    console.log(`  Forensic records seeded: ${FORENSIC_RECORDS.length}`);

    // ---- 5. Custody events ----------------------------------------------
    for (const ev of CUSTODY_EVENTS) {
      const caseId = caseIdFor(caseFirByEvidence[ev.evidenceId]);
      await client.query(
        `INSERT INTO custody_events (event_id, evidence_id, case_id, event_type, actor,
                                     from_custodian, to_custodian, location, tx_id,
                                     blockchain_verified, seal_id, notes, occurred_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
         ON CONFLICT (event_id) DO UPDATE SET
           event_type = EXCLUDED.event_type, actor = EXCLUDED.actor,
           from_custodian = EXCLUDED.from_custodian, to_custodian = EXCLUDED.to_custodian,
           location = EXCLUDED.location, tx_id = EXCLUDED.tx_id,
           blockchain_verified = EXCLUDED.blockchain_verified,
           seal_id = EXCLUDED.seal_id, notes = EXCLUDED.notes,
           occurred_at = EXCLUDED.occurred_at`,
        [ev.id, ev.evidenceId, caseId, ev.eventType, ev.actor, ev.fromCustodian || null,
         ev.toCustodian || null, ev.location, ev.txId, ev.blockchainVerified,
         ev.sealId || null, ev.notes || null, ev.timestamp]
      );
    }
    console.log(`  Custody events seeded:   ${CUSTODY_EVENTS.length}`);

    // ---- 6. Alerts -------------------------------------------------------
    for (const a of ALERTS) {
      await client.query(
        `INSERT INTO alerts (alert_id, severity, type, case_id, evidence_id, title, description,
                             status, raised_at, acknowledged_at, resolved_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         ON CONFLICT (alert_id) DO UPDATE SET
           severity = EXCLUDED.severity, type = EXCLUDED.type, case_id = EXCLUDED.case_id,
           evidence_id = EXCLUDED.evidence_id, title = EXCLUDED.title,
           description = EXCLUDED.description, status = EXCLUDED.status,
           raised_at = EXCLUDED.raised_at, acknowledged_at = EXCLUDED.acknowledged_at,
           resolved_at = EXCLUDED.resolved_at`,
        [a.id, a.severity, a.type, a.caseFir ? caseIdFor(a.caseFir) : null, a.evidenceId,
         a.title, a.description, a.status, a.timestamp,
         a.status === 'Acknowledged' || a.status === 'Resolved' ? a.timestamp : null,
         a.status === 'Resolved' ? a.timestamp : null]
      );
    }
    console.log(`  Alerts seeded:           ${ALERTS.length}`);

    // ---- 7. Audit trail --------------------------------------------------
    for (let i = 0; i < AUDIT_EVENTS.length; i++) {
      const a = AUDIT_EVENTS[i];
      const ref = auditRefFor(i);
      const userId = USER_ID_BY_NAME[a.user] || null;
      // Keyed on the synthetic ref held in metadata_hash so re-seeding
      // refreshes the same row rather than appending duplicates.
      const { rows } = await client.query(`SELECT log_id FROM audit_logs WHERE metadata_hash = $1`, [ref]);
      if (rows.length) {
        await client.query(
          `UPDATE audit_logs SET case_id=$1, evidence_id=$2, action=$3, user_id=$4, user_name=$5,
                                 user_role=$6, timestamp=$7, blockchain_tx_id=$8,
                                 verification_status=$9, details=$10, source='WEB'
           WHERE log_id = $11`,
          [a.caseFir ? caseIdFor(a.caseFir) : null, a.evidenceId, a.action, userId, a.user,
           a.role, a.timestamp, a.txId, a.verificationStatus, a.details, rows[0].log_id]
        );
      } else {
        await client.query(
          `INSERT INTO audit_logs (case_id, evidence_id, action, user_id, user_name, user_role,
                                   timestamp, result, blockchain_tx_id, verification_status,
                                   details, metadata_hash, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'WEB')`,
          [a.caseFir ? caseIdFor(a.caseFir) : null, a.evidenceId, a.action, userId, a.user,
           a.role, a.timestamp, a.verificationStatus === 'Failed' ? 'MISMATCH' : 'SUCCESS',
           a.txId, a.verificationStatus, a.details, ref]
        );
      }
    }
    console.log(`  Audit events seeded:     ${AUDIT_EVENTS.length}`);

    // ---- Summary ---------------------------------------------------------
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users)            AS users,
        (SELECT COUNT(*) FROM cases)            AS cases,
        (SELECT COUNT(*) FROM evidence)         AS evidence,
        (SELECT COUNT(*) FROM forensic_records) AS forensic_records,
        (SELECT COUNT(*) FROM custody_events)   AS custody_events,
        (SELECT COUNT(*) FROM alerts)           AS alerts,
        (SELECT COUNT(*) FROM audit_logs)       AS audit_logs`);
    console.log('\n  Database totals now:');
    Object.entries(counts.rows[0]).forEach(([k, v]) => console.log(`    ${k.padEnd(18)} ${v}`));
    console.log('\nSeed complete.\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\nSeed FAILED:', err.message);
  if (err.detail) console.error('Detail:', err.detail);
  process.exit(1);
});
