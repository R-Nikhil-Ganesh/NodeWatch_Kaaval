/**
 * backend/src/db/seed.cjs
 * Run with: npm run db:seed
 *
 * Seeds:
 *  - Base unified users/cases/evidence (shared with mobile + web apps)
 *  - Legal-domain users, cases (with extended court metadata), hearings,
 *    parties, case files (documents) and evidence, plus historical audit logs.
 *
 * Idempotent — safe to re-run (INSERT ... ON CONFLICT DO NOTHING).
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BCRYPT_ROUNDS = 10;

// All relative-day offsets are anchored to this date, matching the frontend mock data.
const TODAY = new Date('2026-09-02T09:00:00+05:30');
const iso = (offsetDays, hour = 10, minute = 30) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ---------------------------------------------------------------------------
// BASE USERS (shared across mobile / web / legal)
// ---------------------------------------------------------------------------
const USERS = [
  { user_id: 'u_admin_1', username: 'admin1', email: 'rajendran.k@tnpolice.gov.in', password: 'password123', name: 'K. Rajendran', role: 'ADMIN', designation: 'IT Director', org_msp: 'Org1MSP' },
  { user_id: 'u_admin_2', username: 'admin2', email: 'priya.kumar@tnpolice.gov.in', password: 'password123', name: 'Priya Kumar', role: 'ADMIN', designation: 'System Administrator', org_msp: 'Org1MSP' },
  { user_id: 'u_police_1', username: 'police1', email: 'murugan.s@tnpolice.gov.in', password: 'password123', name: 'S. Murugan', role: 'POLICE', designation: 'Inspector of Police', badge_number: 'TN-PD-402', org_msp: 'Org1MSP' },
  { user_id: 'u_police_2', username: 'police2', email: 'anbu.selvam@tnpolice.gov.in', password: 'password123', name: 'Anbu Selvam', role: 'POLICE', designation: 'Superintendent of Police (SP)', badge_number: 'TN-PD-551', org_msp: 'Org1MSP' },
  { user_id: 'u_forensics_1', username: 'forensic1', email: 'karthik.venkat@tnfsl.gov.in', password: 'password123', name: 'Dr. Karthik Venkat', role: 'FORENSICS', designation: 'Senior Scientific Officer', org_msp: 'Org2MSP' },
  { user_id: 'u_forensics_2', username: 'forensic2', email: 'lakshmi.raman@tnfsl.gov.in', password: 'password123', name: 'Lakshmi Raman', role: 'FORENSICS', designation: 'Scientific Assistant', org_msp: 'Org2MSP' },
  {
    user_id: 'u_legal_1', username: 'legal1', email: 'vijay.sundaram@tngovt.in', password: 'password123',
    name: 'Vijay Sundaram', role: 'LEGAL', designation: 'Public Prosecutor', org_msp: 'Org3MSP',
    bar_judicial_id: 'TN/PP/2014/0432', court: 'IX Additional City Civil & Sessions Court, Chennai',
    jurisdiction: 'Chennai District, Tamil Nadu', phone: '+91 98410 22345',
  },
  { user_id: 'u_legal_2', username: 'legal2', email: 'meena.krishnan@tnhc.gov.in', password: 'password123', name: 'Meena Krishnan', role: 'LEGAL', designation: 'District Judge', org_msp: 'Org3MSP' },
  {
    user_id: 'u_legal_3', username: 'legal3', email: 'kalaiselvi.r@tnjudiciary.gov.in', password: 'password123',
    name: 'Justice R. Kalaiselvi', role: 'LEGAL', designation: 'District Judge', org_msp: 'Org3MSP',
    bar_judicial_id: 'TNJS/0091', court: 'Principal District & Sessions Court, Madurai',
    jurisdiction: 'Madurai District, Tamil Nadu', phone: '+91 94420 11876',
  },
  {
    user_id: 'u_legal_4', username: 'legal4', email: 'aishwarya.menon@tnbar.org', password: 'password123',
    name: 'Aishwarya Menon', role: 'LEGAL', designation: 'Defense Counsel', org_msp: 'Org3MSP',
    bar_judicial_id: 'TN/BAR/2011/8821', court: 'IX Additional City Civil & Sessions Court, Chennai',
    jurisdiction: 'Chennai District, Tamil Nadu', phone: '+91 90031 44290',
  },
  {
    user_id: 'u_legal_5', username: 'legal5', email: 'ganesh.p@tnjudiciary.gov.in', password: 'password123',
    name: 'Ganesh Prabhakaran', role: 'LEGAL', designation: 'Registrar', org_msp: 'Org3MSP',
    bar_judicial_id: 'TNJS/REG/0056', court: 'Principal District & Sessions Court, Coimbatore',
    jurisdiction: 'Coimbatore District, Tamil Nadu', phone: '+91 96290 78123',
  },
  { user_id: 'u1', username: 'nikhil', email: 'nikhil@police.tn.gov', password: 'password123', name: 'Nikhil Ganesh', role: 'POLICE', designation: 'Inspector of Police', badge_number: 'TN-KK-001', org_msp: 'Org1MSP' },
  { user_id: 'u2', username: 'kavitha', email: 'kavitha@lab.tn.gov', password: 'password123', name: 'Dr. Kavitha', role: 'FORENSICS', designation: 'Senior Scientific Officer', org_msp: 'Org2MSP' },
  { user_id: 'admin1', username: 'mob_admin', email: 'admin@police.tn.gov', password: 'adminpassword', name: 'Superintendent (Admin)', role: 'ADMIN', designation: 'System Administrator', org_msp: 'Org1MSP' },
];

// ---------------------------------------------------------------------------
// BASE CASES + EVIDENCE (police/mobile/web domain — unrelated to legal, kept
// for a coherent unified database)
// ---------------------------------------------------------------------------
const BASE_CASES = [
  { case_id: 'CASE-2024-001', title: 'Robbery at Central Bank', description: 'Armed robbery reported at downtown branch.', status: 'UNDER_INVESTIGATION', location: 'Central Bank, Chennai', created_by_user_id: 'u_police_1', current_custodian_id: 'u_police_1', current_custodian_name: 'S. Murugan', assigned_forensics_id: 'u_forensics_1', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { case_id: 'CASE-2024-002', title: 'Traffic Incident #992', description: 'Hit and run on 5th Avenue.', status: 'OPEN', location: '5th Avenue, Chennai', created_by_user_id: 'u_police_1', current_custodian_id: 'u_police_1', current_custodian_name: 'S. Murugan', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const BASE_EVIDENCE = [
  { evidence_id: 'EV-001-A', case_id: 'CASE-2024-001', name: 'CCTV Frame 01', file_name: 'cctv_frame_01.jpg', type: 'IMAGE', file_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1', metadata_hash: '0x123abc', source_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1', classification: 'PRIMARY', integrity_status: 'VERIFIED', approved_for_legal: true, notes: 'Recovered from damaged server', uploaded_by: 'u_police_1', current_custodian_id: 'u_forensics_1', current_custodian_name: 'Dr. Karthik Venkat', collected_location: 'Central Bank Main Hall', linked_evidence_ids: JSON.stringify(['EV-001-B']), created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { evidence_id: 'EV-001-B', case_id: 'CASE-2024-001', name: 'Shell Casing Sample', file_name: 'shell_casing.docx', type: 'PHYSICAL', file_hash: '0xffffeeee', metadata_hash: '0xaaabbb', classification: 'SECONDARY', integrity_status: 'PENDING', approved_for_legal: false, notes: 'Ballistics report pending', uploaded_by: 'u_forensics_1', current_custodian_id: 'u_forensics_1', current_custodian_name: 'Dr. Karthik Venkat', collected_location: 'Lab A', linked_evidence_ids: JSON.stringify(['EV-001-A']), created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
];

// ---------------------------------------------------------------------------
// LEGAL DOMAIN — CASES (with parties nested)
// ---------------------------------------------------------------------------
const LEGAL_CASES = [
  { case_id: 'CASE-2024-011', cnr_number: 'TNCH01-001123-2024', fir_number: '412/2024', fir_date: iso(-210), police_station: 'T. Nagar Police Station', district: 'Chennai', state: 'Tamil Nadu', title: 'State vs. Arun Kumar', case_type: 'Theft', sections: ['BNS 303(2)', 'BNS 331(4)'], description: 'Accused allegedly broke into a jewellery showroom on Usman Road overnight and removed gold ornaments worth approx. ₹18.5 lakh. CCTV footage and a recovered crowbar form the primary evidence.', court: 'IX Additional City Civil & Sessions Court, Chennai', presiding_judge: "Hon'ble Justice R. Kalaiselvi", public_prosecutor: 'Vijay Sundaram', defense_counsel: 'Aishwarya Menon', investigating_officer: 'S. Murugan', investigating_officer_designation: 'Sub-Inspector of Police', court_stage: 'PROSECUTION_EVIDENCE', outcome: 'NONE', registered_at: iso(-205), first_hearing_date: iso(-160), last_hearing_date: iso(-18), upcoming_hearing_date: iso(12), current_custodian_name: 'Registry, IX Addl. City Civil & Sessions Court', created_by_user_id: 'u_police_1',
    parties: [
      { role: 'Accused', name: 'Arun Kumar', age: 29, address: 'No. 14, Bazaar Street, T. Nagar, Chennai', custody_status: 'On Bail' },
      { role: 'Complainant', name: 'Suresh Jewellers (Prop. R. Suresh Babu)', address: 'Usman Road, T. Nagar, Chennai' },
      { role: 'Witness', name: 'Kannan V.', address: 'Security guard, adjacent showroom' },
    ] },
  { case_id: 'CASE-2024-014', cnr_number: 'TNCH01-001256-2024', fir_number: '588/2024', fir_date: iso(-165), police_station: 'Anna Nagar Police Station', district: 'Chennai', state: 'Tamil Nadu', title: 'State vs. Selvam & Ors.', case_type: 'Robbery', sections: ['BNS 309(4)', 'BNS 3(5)'], description: 'Three accused persons allegedly waylaid the complainant near Thirumangalam signal at night, assaulted him and robbed his two-wheeler and mobile phone at knife-point.', court: 'IX Additional City Civil & Sessions Court, Chennai', presiding_judge: "Hon'ble Justice R. Kalaiselvi", public_prosecutor: 'Vijay Sundaram', defense_counsel: 'Aishwarya Menon', investigating_officer: 'S. Murugan', investigating_officer_designation: 'Sub-Inspector of Police', court_stage: 'CHARGES_FRAMED', outcome: 'NONE', registered_at: iso(-160), first_hearing_date: iso(-120), last_hearing_date: iso(-9), upcoming_hearing_date: iso(19), current_custodian_name: 'Registry, IX Addl. City Civil & Sessions Court', created_by_user_id: 'u_police_1',
    parties: [
      { role: 'Accused', name: 'Selvam K.', age: 24, custody_status: 'In Judicial Custody' },
      { role: 'Accused', name: 'Bala Murugan', age: 22, custody_status: 'In Judicial Custody' },
      { role: 'Accused', name: 'Raja (minor co-accused tried separately)', age: 17, custody_status: 'N/A' },
      { role: 'Complainant', name: 'Dinesh Ramamoorthy', address: 'Thirumangalam, Chennai' },
    ] },
  { case_id: 'CASE-2023-087', cnr_number: 'TNMD02-000734-2023', fir_number: '221/2023', fir_date: iso(-640), police_station: 'Anna Nagar Police Station, Madurai', district: 'Madurai', state: 'Tamil Nadu', title: 'State vs. Prakash Raj', case_type: 'Murder', sections: ['IPC 302', 'IPC 34'], description: 'Accused allegedly stabbed the deceased following a land dispute. Post-mortem confirms homicidal death; a blood-stained knife was recovered from the scene and sent for forensic analysis.', court: 'Principal District & Sessions Court, Madurai', presiding_judge: "Hon'ble Justice R. Kalaiselvi", public_prosecutor: 'K. Elangovan', defense_counsel: 'M. Saravanan', investigating_officer: 'P. Rajkumar', investigating_officer_designation: 'Inspector of Police', court_stage: 'DEFENCE_EVIDENCE', outcome: 'NONE', registered_at: iso(-630), first_hearing_date: iso(-560), last_hearing_date: iso(-25), upcoming_hearing_date: iso(15), current_custodian_name: 'Registry, Principal District & Sessions Court, Madurai', created_by_user_id: 'u_police_1',
    parties: [
      { role: 'Accused', name: 'Prakash Raj', age: 41, custody_status: 'In Judicial Custody' },
      { role: 'Victim', name: 'Muthuvel S. (Deceased)', age: 47 },
      { role: 'Witness', name: 'Kamala Devi', address: 'Eyewitness, neighbour of deceased' },
    ] },
  { case_id: 'CASE-2024-022', cnr_number: 'TNCB03-000456-2024', fir_number: '77/2024', fir_date: iso(-95), police_station: 'Cyber Crime Police Station, Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', title: 'State vs. Unidentified (Cyber Fraud Ring)', case_type: 'Cyber Crime', sections: ['BNS 318(4)', 'BNS 319(2)', 'IT Act 66C', 'IT Act 66D'], description: 'Complainant lost ₹6.2 lakh to a fake investment app promoted over WhatsApp. Investigators traced mule bank accounts and a VoIP number; digital evidence includes app APK, transaction logs and CDRs.', court: 'Chief Judicial Magistrate Court, Coimbatore', presiding_judge: "Hon'ble Justice T. Balamurugan", public_prosecutor: 'N. Priyadarshini', defense_counsel: 'Not yet appointed (accused unidentified)', investigating_officer: 'Karthik Venkat', investigating_officer_designation: 'Deputy Superintendent of Police, Cyber Crime Wing', court_stage: 'COGNIZANCE_TAKEN', outcome: 'NONE', registered_at: iso(-90), first_hearing_date: iso(-40), last_hearing_date: iso(-40), upcoming_hearing_date: iso(22), current_custodian_name: 'Registry, CJM Court, Coimbatore', created_by_user_id: 'u_forensics_1',
    parties: [
      { role: 'Complainant', name: 'Meenakshi Sundaram', address: 'RS Puram, Coimbatore' },
      { role: 'Accused', name: 'Unidentified (mule account holders under investigation)', custody_status: 'N/A' },
    ] },
  { case_id: 'CASE-2024-031', cnr_number: 'TNCH01-001489-2024', fir_number: '903/2024', fir_date: iso(-140), police_station: 'Egmore Police Station', district: 'Chennai', state: 'Tamil Nadu', title: 'State vs. Manoj & Vignesh', case_type: 'Narcotics (NDPS)', sections: ['NDPS Act 20(b)(ii)(C)', 'NDPS Act 22(c)'], description: 'Accused intercepted near Egmore railway station with 2.1 kg of ganja and 40g of synthetic MDMA tablets concealed in a travel bag. Seizure conducted before two independent panch witnesses.', court: 'Special Court for NDPS Cases, Chennai', presiding_judge: "Hon'ble Justice S. Devendran", public_prosecutor: 'Vijay Sundaram', defense_counsel: 'R. Kavitha', investigating_officer: 'A. Bhuvaneswari', investigating_officer_designation: 'Inspector of Police, Narcotics Cell', court_stage: 'PROSECUTION_EVIDENCE', outcome: 'NONE', registered_at: iso(-135), first_hearing_date: iso(-100), last_hearing_date: iso(-14), upcoming_hearing_date: iso(9), current_custodian_name: 'Registry, Special Court for NDPS Cases, Chennai', created_by_user_id: 'u_police_1',
    parties: [
      { role: 'Accused', name: 'Manoj Kumar', age: 27, custody_status: 'In Judicial Custody' },
      { role: 'Accused', name: 'Vignesh S.', age: 25, custody_status: 'In Judicial Custody' },
    ] },
  { case_id: 'CASE-2024-019', cnr_number: 'TNCH01-001301-2024', fir_number: '654/2024', fir_date: iso(-300), police_station: 'T. Nagar Police Station', district: 'Chennai', state: 'Tamil Nadu', title: 'Meena Sundaram vs. Ramesh Iyer', case_type: 'Cheating & Criminal Breach of Trust', sections: ['BNS 316(2)', 'BNS 318(4)'], description: 'Complainant alleges the accused, a chit-fund organiser, collected ₹9.4 lakh in instalments over 14 months and absconded without disbursing the prize amount. Bank statements and WhatsApp chat exports form key documentary evidence.', court: 'IX Additional City Civil & Sessions Court, Chennai', presiding_judge: "Hon'ble Justice R. Kalaiselvi", public_prosecutor: 'Vijay Sundaram', defense_counsel: 'G. Nandakumar', investigating_officer: 'S. Murugan', investigating_officer_designation: 'Sub-Inspector of Police', court_stage: 'FINAL_ARGUMENTS', outcome: 'NONE', registered_at: iso(-295), first_hearing_date: iso(-260), last_hearing_date: iso(-6), upcoming_hearing_date: iso(11), current_custodian_name: 'Registry, IX Addl. City Civil & Sessions Court', created_by_user_id: 'u_police_1',
    parties: [
      { role: 'Accused', name: 'Ramesh Iyer', age: 38, custody_status: 'On Bail' },
      { role: 'Complainant', name: 'Meena Sundaram', address: 'West Mambalam, Chennai' },
    ] },
  { case_id: 'CASE-2024-005', cnr_number: 'TNCH04-000212-2024', fir_number: '58/2024', fir_date: iso(-330), police_station: 'All Women Police Station, Kilpauk', district: 'Chennai', state: 'Tamil Nadu', title: 'State vs. R. Selvakumar', case_type: 'Sexual Assault (POCSO)', sections: ['POCSO Act 4', 'POCSO Act 6', 'BNS 64'], description: "Tried in-camera before the POCSO Special Court. Victim particulars are withheld under Section 23 of the POCSO Act, 2012. Statement of the minor victim recorded under Section 183 BNSS before the Magistrate.", court: 'Special Court for POCSO Cases, Chennai', presiding_judge: "Hon'ble Justice Lakshmi Priya", public_prosecutor: 'N. Priyadarshini', defense_counsel: 'G. Nandakumar', investigating_officer: 'A. Bhuvaneswari', investigating_officer_designation: 'Inspector of Police, AWPS Kilpauk', court_stage: 'PROSECUTION_EVIDENCE', outcome: 'NONE', registered_at: iso(-325), first_hearing_date: iso(-280), last_hearing_date: iso(-20), upcoming_hearing_date: iso(7), current_custodian_name: 'Registry, Special Court for POCSO Cases, Chennai (Sealed Record)', created_by_user_id: 'u_police_1',
    parties: [
      { role: 'Accused', name: 'R. Selvakumar', age: 34, custody_status: 'In Judicial Custody' },
      { role: 'Victim', name: 'Minor Victim — identity protected u/s 23 POCSO Act', age: 14 },
    ] },
  { case_id: 'CASE-2022-045', cnr_number: 'TNCB03-000198-2022', fir_number: '312/2022', fir_date: iso(-1480), police_station: 'RS Puram Police Station', district: 'Coimbatore', state: 'Tamil Nadu', title: 'State vs. Dinesh Babu', case_type: 'Assault & Hurt', sections: ['IPC 323', 'IPC 324', 'IPC 506(i)'], description: 'Accused assaulted the complainant with a wooden rod during a dispute over parking space, causing a fracture. Medical records and eyewitness testimony formed the basis of conviction.', court: 'Judicial Magistrate Court No. II, Coimbatore', presiding_judge: "Hon'ble Justice T. Balamurugan", public_prosecutor: 'N. Priyadarshini', defense_counsel: 'R. Kavitha', investigating_officer: 'Karthik Venkat', investigating_officer_designation: 'Sub-Inspector of Police', court_stage: 'DISPOSED', outcome: 'CONVICTED', registered_at: iso(-1475), first_hearing_date: iso(-1440), last_hearing_date: iso(-980), disposed_at: iso(-980), current_custodian_name: 'Court Record Room, JMC No. II, Coimbatore', created_by_user_id: 'u_forensics_1',
    parties: [
      { role: 'Accused', name: 'Dinesh Babu', age: 33, custody_status: 'N/A' },
      { role: 'Complainant', name: 'Vetri Selvan', address: 'RS Puram, Coimbatore' },
    ] },
  { case_id: 'CASE-2023-102', cnr_number: 'TNTR05-000341-2023', fir_number: '145/2023', fir_date: iso(-1120), police_station: 'Srirangam Police Station', district: 'Tiruchirappalli', state: 'Tamil Nadu', title: 'State vs. Ajay Kannan', case_type: 'Kidnapping', sections: ['IPC 363', 'IPC 366'], description: "Accused was alleged to have taken a minor away without consent of the lawful guardian. Trial concluded in acquittal after the prosecution witnesses turned hostile and the minor's statement corroborated a consensual elopement.", court: 'Principal District & Sessions Court, Tiruchirappalli', presiding_judge: "Hon'ble Justice S. Devendran", public_prosecutor: 'K. Elangovan', defense_counsel: 'M. Saravanan', investigating_officer: 'P. Rajkumar', investigating_officer_designation: 'Inspector of Police', court_stage: 'DISPOSED', outcome: 'ACQUITTED', registered_at: iso(-1115), first_hearing_date: iso(-1080), last_hearing_date: iso(-560), disposed_at: iso(-560), current_custodian_name: 'Court Record Room, District & Sessions Court, Tiruchirappalli', created_by_user_id: 'u_police_1',
    parties: [
      { role: 'Accused', name: 'Ajay Kannan', age: 23, custody_status: 'N/A' },
      { role: 'Victim', name: 'Minor — identity withheld', age: 17 },
    ] },
  { case_id: 'CASE-2021-076', cnr_number: 'TNCH01-000876-2021', fir_number: '967/2021', fir_date: iso(-1850), police_station: 'Mylapore Police Station', district: 'Chennai', state: 'Tamil Nadu', title: 'State vs. Suresh Kumar', case_type: 'Counterfeit Currency', sections: ['IPC 489B', 'IPC 489C'], description: 'Accused apprehended while circulating counterfeit ₹500 notes at a local market. Forensic Science Laboratory report confirmed the seized notes as counterfeit; sentenced to 5 years rigorous imprisonment.', court: 'IX Additional City Civil & Sessions Court, Chennai', presiding_judge: "Hon'ble Justice R. Kalaiselvi", public_prosecutor: 'Vijay Sundaram', defense_counsel: 'Aishwarya Menon', investigating_officer: 'S. Murugan', investigating_officer_designation: 'Sub-Inspector of Police', court_stage: 'DISPOSED', outcome: 'CONVICTED', registered_at: iso(-1845), first_hearing_date: iso(-1800), last_hearing_date: iso(-1210), disposed_at: iso(-1210), current_custodian_name: 'Court Record Room, IX Addl. City Civil & Sessions Court', created_by_user_id: 'u_police_1',
    parties: [{ role: 'Accused', name: 'Suresh Kumar', age: 45, custody_status: 'N/A' }] },
];

// ---------------------------------------------------------------------------
// Per-case generated hearings / files / evidence / audit logs.
// Realistic and internally consistent with each case's narrative and stage,
// anchored on the case's own first/last/upcoming hearing dates.
// ---------------------------------------------------------------------------
function buildHearings(c) {
  const isDisposed = c.court_stage === 'DISPOSED';
  const rows = [
    {
      hearing_id: `H-${c.case_id}-1`, case_id: c.case_id, hearing_date: c.first_hearing_date,
      court: c.court, judge: c.presiding_judge.replace(/^Hon'ble Justice /, 'Justice '),
      purpose: 'Framing of Charge',
      statement: `Chargesheet furnished to the accused under Section 230 BNSS. Sections ${c.sections.join(', ')} read over and explained. Case posted for trial.`,
      next_hearing_date: c.last_hearing_date, prosecutor_present: true, defense_counsel_present: true, accused_present: true,
    },
  ];
  rows.push({
    hearing_id: `H-${c.case_id}-2`, case_id: c.case_id, hearing_date: c.last_hearing_date,
    court: c.court, judge: c.presiding_judge.replace(/^Hon'ble Justice /, 'Justice '),
    purpose: isDisposed ? 'Judgment' : 'Prosecution Evidence',
    statement: isDisposed
      ? `Arguments concluded on both sides. Accused ${c.outcome === 'CONVICTED' ? 'found guilty and sentenced accordingly' : 'acquitted for want of sufficient evidence'} under the sections charged.`
      : `Prosecution evidence recorded; investigating officer ${c.investigating_officer} examined. Matter posted for further hearing.`,
    next_hearing_date: isDisposed ? null : c.upcoming_hearing_date,
    prosecutor_present: true, defense_counsel_present: true, accused_present: true,
  });
  if (!isDisposed && c.upcoming_hearing_date) {
    // Represent the already-scheduled upcoming hearing as a pending row is unnecessary —
    // the case's own upcoming_hearing_date column drives that display.
  }
  return rows;
}

function buildFiles(c) {
  const files = [
    { doc_type_label: 'FIR', title: `FIR No. ${c.fir_number} — ${c.police_station}`, description: `First Information Report registered under ${c.sections[0]} on the complaint leading to this case.`, uploaded_by_role: c.investigating_officer_designation, file_format: 'PDF', file_size_kb: 700 + Math.floor(Math.random() * 400), created_at: c.fir_date },
    { doc_type_label: 'Chargesheet', title: 'Final Report u/s 193 BNSS', description: `Police report on completion of investigation, listing prosecution witnesses and case property for ${c.title}.`, uploaded_by_role: c.investigating_officer_designation, file_format: 'PDF', file_size_kb: 1100 + Math.floor(Math.random() * 500), created_at: c.first_hearing_date },
  ];
  if (c.court_stage === 'DISPOSED') {
    files.push({ doc_type_label: 'Court Order', title: 'Judgment Order', description: `Final judgment: accused ${c.outcome === 'CONVICTED' ? 'convicted' : 'acquitted'}.`, uploaded_by_role: 'Court Registry', file_format: 'PDF', file_size_kb: 300 + Math.floor(Math.random() * 100), created_at: c.disposed_at });
  } else {
    files.push({ doc_type_label: 'Consent Form / Panchnama', title: 'Scene of Crime Panchnama', description: 'Seizure memo prepared before two independent panch witnesses at the scene.', uploaded_by_role: c.investigating_officer_designation, file_format: 'PDF', file_size_kb: 400 + Math.floor(Math.random() * 300), created_at: c.fir_date });
  }
  return files.map((f, i) => ({ ...f, related_sections: c.sections, case_id: c.case_id, _idx: i }));
}

function buildEvidence(c) {
  const hash = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return [
    {
      evidence_id: `EV-${c.case_id}-P1`, case_id: c.case_id, name: `Case property — ${c.case_type}`, category: 'Document',
      file_name: `${c.case_id}_physical_exhibit`, type: 'PHYSICAL', collected_location: `Malkhana, ${c.police_station}`,
      seal_number: `MLK/${c.case_id}`, classification: 'SECONDARY', integrity_status: 'PENDING',
      uploaded_by: c.created_by_user_id, current_custodian_name: c.current_custodian_name, created_at: c.fir_date,
    },
    {
      evidence_id: `EV-${c.case_id}-D1`, case_id: c.case_id, name: `Primary digital exhibit`, category: null,
      file_name: `${c.case_id}_primary_evidence.pdf`, type: 'PDF', collected_location: c.police_station,
      file_hash: hash(), classification: 'PRIMARY', integrity_status: 'VERIFIED', approved_for_legal: true,
      ledger_block_ref: `Block #${100000 + Math.floor(Math.random() * 90000)}`,
      uploaded_by: c.created_by_user_id, current_custodian_name: c.current_custodian_name, created_at: c.fir_date,
    },
  ];
}

function buildAuditLogs(c) {
  return [
    { case_id: c.case_id, action: 'CREATE_CASE', user_id: 'u_police_1', user_role: 'POLICE', source: 'WEB', timestamp: c.registered_at, detail_title: `Case filed in court registry` },
    { case_id: c.case_id, action: 'CASE_VIEWED', user_id: 'u_legal_1', user_role: 'LEGAL', source: 'WEB', timestamp: c.first_hearing_date, detail_title: 'Opened case for review' },
  ];
}

// ---------------------------------------------------------------------------
// RUNNER
// ---------------------------------------------------------------------------
async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Seeding users...');
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      await client.query(
        `INSERT INTO users (user_id, username, email, password_hash, name, role, designation, badge_number, org_msp, bar_judicial_id, court, jurisdiction, phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (user_id) DO NOTHING`,
        [u.user_id, u.username, u.email, hash, u.name, u.role, u.designation || '', u.badge_number || null,
         u.org_msp || 'Org1MSP', u.bar_judicial_id || null, u.court || null, u.jurisdiction || null, u.phone || null]
      );
    }

    console.log('Seeding base cases (mobile/web)...');
    for (const c of BASE_CASES) {
      await client.query(
        `INSERT INTO cases (case_id, title, description, status, location, created_by_user_id, current_custodian_id, current_custodian_name, assigned_forensics_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
         ON CONFLICT (case_id) DO NOTHING`,
        [c.case_id, c.title, c.description, c.status, c.location, c.created_by_user_id, c.current_custodian_id, c.current_custodian_name || null, c.assigned_forensics_id || null, c.created_at]
      );
    }

    console.log('Seeding base evidence (mobile/web)...');
    for (const e of BASE_EVIDENCE) {
      await client.query(
        `INSERT INTO evidence (evidence_id, case_id, name, file_name, type, file_hash, metadata_hash, source_hash, classification, integrity_status, approved_for_legal, notes, uploaded_by, current_custodian_id, current_custodian_name, collected_location, linked_evidence_ids, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)
         ON CONFLICT (evidence_id) DO NOTHING`,
        [e.evidence_id, e.case_id, e.name, e.file_name, e.type, e.file_hash, e.metadata_hash, e.source_hash || null,
         e.classification, e.integrity_status, e.approved_for_legal, e.notes || null, e.uploaded_by, e.current_custodian_id,
         e.current_custodian_name, e.collected_location, e.linked_evidence_ids, e.created_at]
      );
      await client.query(`INSERT INTO evidence_visibility (evidence_id) VALUES ($1) ON CONFLICT (evidence_id) DO NOTHING`, [e.evidence_id]);
    }

    console.log('Seeding legal cases, parties, hearings, files, evidence, audit logs...');
    for (const c of LEGAL_CASES) {
      const caseInsertResult = await client.query(
        `INSERT INTO cases (
           case_id, title, description, status, location, created_by_user_id, current_custodian_name, created_at, updated_at,
           cnr_number, fir_number, fir_date, police_station, district, state, case_type, sections,
           court, presiding_judge, public_prosecutor, defense_counsel, investigating_officer, investigating_officer_designation,
           court_stage, outcome, first_hearing_date, last_hearing_date, upcoming_hearing_date, disposed_at
         ) VALUES ($1,$2,$3,'SUBMITTED_TO_COURT',$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
         ON CONFLICT (case_id) DO NOTHING`,
        [
          c.case_id, c.title, c.description, c.police_station, c.created_by_user_id, c.current_custodian_name, c.registered_at,
          c.cnr_number, c.fir_number, c.fir_date, c.police_station, c.district, c.state, c.case_type, JSON.stringify(c.sections),
          c.court, c.presiding_judge, c.public_prosecutor, c.defense_counsel, c.investigating_officer, c.investigating_officer_designation,
          c.court_stage, c.outcome, c.first_hearing_date, c.last_hearing_date, c.upcoming_hearing_date || null, c.disposed_at || null,
        ]
      );

      // Case already existed from a prior seed run — its parties/files/logs
      // were seeded then too, so skip re-inserting them (they lack a natural
      // key, unlike hearings/evidence below which are ON CONFLICT-safe).
      const isNewCase = caseInsertResult.rowCount > 0;

      if (isNewCase) {
        for (const p of c.parties) {
          await client.query(
            `INSERT INTO case_parties (case_id, role, name, age, address, custody_status)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [c.case_id, p.role, p.name, p.age || null, p.address || null, p.custody_status || null]
          );
        }
      }

      for (const h of buildHearings(c)) {
        await client.query(
          `INSERT INTO case_hearings (hearing_id, case_id, hearing_date, court, judge, purpose, statement, next_hearing_date, prosecutor_present, defense_counsel_present, accused_present)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (hearing_id) DO NOTHING`,
          [h.hearing_id, h.case_id, h.hearing_date, h.court, h.judge, h.purpose, h.statement, h.next_hearing_date || null, h.prosecutor_present, h.defense_counsel_present, h.accused_present]
        );
      }

      if (isNewCase) {
        for (const f of buildFiles(c)) {
          await client.query(
            `INSERT INTO case_documents (case_id, title, type, description, uploaded_by, uploaded_by_role, doc_type_label, file_format, file_size_kb, related_sections, created_at)
             VALUES ($1,$2,'FIR',$3,$4,$5,$6,$7,$8,$9,$10)`,
            [f.case_id, f.title, f.description, c.created_by_user_id, f.uploaded_by_role, f.doc_type_label, f.file_format, f.file_size_kb, JSON.stringify(f.related_sections), f.created_at]
          );
        }
      }

      for (const e of buildEvidence(c)) {
        await client.query(
          `INSERT INTO evidence (evidence_id, case_id, name, file_name, type, category, seal_number, file_hash, classification, integrity_status, approved_for_legal, uploaded_by, current_custodian_name, collected_location, ledger_block_ref, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)
           ON CONFLICT (evidence_id) DO NOTHING`,
          [e.evidence_id, e.case_id, e.name, e.file_name, e.type, e.category || null, e.seal_number || null, e.file_hash || '',
           e.classification, e.integrity_status, e.approved_for_legal || false, e.uploaded_by, e.current_custodian_name,
           e.collected_location, e.ledger_block_ref || null, e.created_at]
        );
        await client.query(`INSERT INTO evidence_visibility (evidence_id) VALUES ($1) ON CONFLICT (evidence_id) DO NOTHING`, [e.evidence_id]);
      }

      if (isNewCase) {
        for (const l of buildAuditLogs(c)) {
          await client.query(
            `INSERT INTO audit_logs (case_id, action, user_id, user_role, source, timestamp, detail_title)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [l.case_id, l.action, l.user_id, l.user_role, l.source, l.timestamp, l.detail_title]
          );
        }
      }
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
