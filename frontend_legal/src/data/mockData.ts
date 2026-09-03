import {
  AuditLogEntry,
  CaseFile,
  CaseOutcome,
  CaseStage,
  CourtCase,
  CustodyEvent,
  DigitalEvidence,
  EvidenceItem,
  Hearing,
  LegalDesignation,
  LegalUser,
  PhysicalEvidence,
} from '../types';

// All relative dates are anchored to "today" so the demo always looks live.
const TODAY = new Date('2026-09-02T09:00:00+05:30');
const iso = (offsetDays: number, hour = 10, minute = 30) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ---------------------------------------------------------------------------
// Users (demo credentials shown on the login screen — password for all: password123)
// ---------------------------------------------------------------------------

export const CURRENT_USER: LegalUser = {
  id: 'u_legal_1',
  name: 'Vijay Sundaram',
  email: 'vijay.sundaram@tngovt.in',
  designation: LegalDesignation.PUBLIC_PROSECUTOR,
  barOrJudicialId: 'TN/PP/2014/0432',
  court: 'IX Additional City Civil & Sessions Court, Chennai',
  jurisdiction: 'Chennai District, Tamil Nadu',
  phone: '+91 98410 22345',
};

export const DEMO_ACCOUNTS: LegalUser[] = [
  CURRENT_USER,
  {
    id: 'u_legal_2',
    name: 'Justice R. Kalaiselvi',
    email: 'kalaiselvi.r@tnjudiciary.gov.in',
    designation: LegalDesignation.DISTRICT_JUDGE,
    barOrJudicialId: 'TNJS/0091',
    court: 'Principal District & Sessions Court, Madurai',
    jurisdiction: 'Madurai District, Tamil Nadu',
    phone: '+91 94420 11876',
  },
  {
    id: 'u_legal_3',
    name: 'Aishwarya Menon',
    email: 'aishwarya.menon@tnbar.org',
    designation: LegalDesignation.DEFENSE_COUNSEL,
    barOrJudicialId: 'TN/BAR/2011/8821',
    court: 'IX Additional City Civil & Sessions Court, Chennai',
    jurisdiction: 'Chennai District, Tamil Nadu',
    phone: '+91 90031 44290',
  },
  {
    id: 'u_legal_4',
    name: 'Ganesh Prabhakaran',
    email: 'ganesh.p@tnjudiciary.gov.in',
    designation: LegalDesignation.REGISTRAR,
    barOrJudicialId: 'TNJS/REG/0056',
    court: 'Principal District & Sessions Court, Coimbatore',
    jurisdiction: 'Coimbatore District, Tamil Nadu',
    phone: '+91 96290 78123',
  },
];

// ---------------------------------------------------------------------------
// Custody trail helper
// ---------------------------------------------------------------------------

const trail = (events: Array<Omit<CustodyEvent, 'eventId'>>, prefix: string): CustodyEvent[] =>
  events.map((e, i) => ({ ...e, eventId: `${prefix}-${i + 1}` }));

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export const CASES: CourtCase[] = [
  {
    caseId: 'CASE-2024-011',
    cnrNumber: 'TNCH01-001123-2024',
    firNumber: '412/2024',
    firDate: iso(-210),
    policeStation: 'T. Nagar Police Station',
    district: 'Chennai',
    state: 'Tamil Nadu',
    title: 'State vs. Arun Kumar',
    caseType: 'Theft',
    sections: ['BNS 303(2)', 'BNS 331(4)'],
    description:
      'Accused allegedly broke into a jewellery showroom on Usman Road overnight and removed gold ornaments worth approx. ₹18.5 lakh. CCTV footage and a recovered crowbar form the primary evidence.',
    court: 'IX Additional City Civil & Sessions Court, Chennai',
    presidingJudge: 'Hon\'ble Justice R. Kalaiselvi',
    publicProsecutor: 'Vijay Sundaram',
    defenseCounsel: 'Aishwarya Menon',
    investigatingOfficer: 'S. Murugan',
    investigatingOfficerDesignation: 'Sub-Inspector of Police',
    parties: [
      { role: 'Accused', name: 'Arun Kumar', age: 29, address: 'No. 14, Bazaar Street, T. Nagar, Chennai', custodyStatus: 'On Bail' },
      { role: 'Complainant', name: 'Suresh Jewellers (Prop. R. Suresh Babu)', address: 'Usman Road, T. Nagar, Chennai' },
      { role: 'Witness', name: 'Kannan V.', address: 'Security guard, adjacent showroom' },
    ],
    stage: CaseStage.PROSECUTION_EVIDENCE,
    outcome: CaseOutcome.NONE,
    registeredAt: iso(-205),
    firstHearingDate: iso(-160),
    lastHearingDate: iso(-18),
    upcomingHearingDate: iso(12),
    currentCustodian: 'Registry, IX Addl. City Civil & Sessions Court',
  },
  {
    caseId: 'CASE-2024-014',
    cnrNumber: 'TNCH01-001256-2024',
    firNumber: '588/2024',
    firDate: iso(-165),
    policeStation: 'Anna Nagar Police Station',
    district: 'Chennai',
    state: 'Tamil Nadu',
    title: 'State vs. Selvam & Ors.',
    caseType: 'Robbery',
    sections: ['BNS 309(4)', 'BNS 3(5)'],
    description:
      'Three accused persons allegedly waylaid the complainant near Thirumangalam signal at night, assaulted him and robbed his two-wheeler and mobile phone at knife-point.',
    court: 'IX Additional City Civil & Sessions Court, Chennai',
    presidingJudge: 'Hon\'ble Justice R. Kalaiselvi',
    publicProsecutor: 'Vijay Sundaram',
    defenseCounsel: 'Aishwarya Menon',
    investigatingOfficer: 'S. Murugan',
    investigatingOfficerDesignation: 'Sub-Inspector of Police',
    parties: [
      { role: 'Accused', name: 'Selvam K.', age: 24, custodyStatus: 'In Judicial Custody' },
      { role: 'Accused', name: 'Bala Murugan', age: 22, custodyStatus: 'In Judicial Custody' },
      { role: 'Accused', name: 'Raja (minor co-accused tried separately)', age: 17, custodyStatus: 'N/A' },
      { role: 'Complainant', name: 'Dinesh Ramamoorthy', address: 'Thirumangalam, Chennai' },
    ],
    stage: CaseStage.CHARGES_FRAMED,
    outcome: CaseOutcome.NONE,
    registeredAt: iso(-160),
    firstHearingDate: iso(-120),
    lastHearingDate: iso(-9),
    upcomingHearingDate: iso(19),
    currentCustodian: 'Registry, IX Addl. City Civil & Sessions Court',
  },
  {
    caseId: 'CASE-2023-087',
    cnrNumber: 'TNMD02-000734-2023',
    firNumber: '221/2023',
    firDate: iso(-640),
    policeStation: 'Anna Nagar Police Station, Madurai',
    district: 'Madurai',
    state: 'Tamil Nadu',
    title: 'State vs. Prakash Raj',
    caseType: 'Murder',
    sections: ['IPC 302', 'IPC 34'],
    description:
      'Accused allegedly stabbed the deceased following a land dispute. Post-mortem confirms homicidal death; a blood-stained knife was recovered from the scene and sent for forensic analysis.',
    court: 'Principal District & Sessions Court, Madurai',
    presidingJudge: 'Hon\'ble Justice R. Kalaiselvi',
    publicProsecutor: 'K. Elangovan',
    defenseCounsel: 'M. Saravanan',
    investigatingOfficer: 'P. Rajkumar',
    investigatingOfficerDesignation: 'Inspector of Police',
    parties: [
      { role: 'Accused', name: 'Prakash Raj', age: 41, custodyStatus: 'In Judicial Custody' },
      { role: 'Victim', name: 'Muthuvel S. (Deceased)', age: 47 },
      { role: 'Witness', name: 'Kamala Devi', address: 'Eyewitness, neighbour of deceased' },
    ],
    stage: CaseStage.DEFENCE_EVIDENCE,
    outcome: CaseOutcome.NONE,
    registeredAt: iso(-630),
    firstHearingDate: iso(-560),
    lastHearingDate: iso(-25),
    upcomingHearingDate: iso(15),
    currentCustodian: 'Registry, Principal District & Sessions Court, Madurai',
  },
  {
    caseId: 'CASE-2024-022',
    cnrNumber: 'TNCB03-000456-2024',
    firNumber: '77/2024',
    firDate: iso(-95),
    policeStation: 'Cyber Crime Police Station, Coimbatore',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    title: 'State vs. Unidentified (Cyber Fraud Ring)',
    caseType: 'Cyber Crime',
    sections: ['BNS 318(4)', 'BNS 319(2)', 'IT Act 66C', 'IT Act 66D'],
    description:
      'Complainant lost ₹6.2 lakh to a fake investment app promoted over WhatsApp. Investigators traced mule bank accounts and a VoIP number; digital evidence includes app APK, transaction logs and CDRs.',
    court: 'Chief Judicial Magistrate Court, Coimbatore',
    presidingJudge: 'Hon\'ble Justice T. Balamurugan',
    publicProsecutor: 'N. Priyadarshini',
    defenseCounsel: 'Not yet appointed (accused unidentified)',
    investigatingOfficer: 'Karthik Venkat',
    investigatingOfficerDesignation: 'Deputy Superintendent of Police, Cyber Crime Wing',
    parties: [
      { role: 'Complainant', name: 'Meenakshi Sundaram', address: 'RS Puram, Coimbatore' },
      { role: 'Accused', name: 'Unidentified (mule account holders under investigation)', custodyStatus: 'N/A' },
    ],
    stage: CaseStage.COGNIZANCE_TAKEN,
    outcome: CaseOutcome.NONE,
    registeredAt: iso(-90),
    firstHearingDate: iso(-40),
    lastHearingDate: iso(-40),
    upcomingHearingDate: iso(22),
    currentCustodian: 'Registry, CJM Court, Coimbatore',
  },
  {
    caseId: 'CASE-2024-031',
    cnrNumber: 'TNCH01-001489-2024',
    firNumber: '903/2024',
    firDate: iso(-140),
    policeStation: 'Egmore Police Station',
    district: 'Chennai',
    state: 'Tamil Nadu',
    title: 'State vs. Manoj & Vignesh',
    caseType: 'Narcotics (NDPS)',
    sections: ['NDPS Act 20(b)(ii)(C)', 'NDPS Act 22(c)'],
    description:
      'Accused intercepted near Egmore railway station with 2.1 kg of ganja and 40g of synthetic MDMA tablets concealed in a travel bag. Seizure conducted before two independent panch witnesses.',
    court: 'Special Court for NDPS Cases, Chennai',
    presidingJudge: 'Hon\'ble Justice S. Devendran',
    publicProsecutor: 'Vijay Sundaram',
    defenseCounsel: 'R. Kavitha',
    investigatingOfficer: 'A. Bhuvaneswari',
    investigatingOfficerDesignation: 'Inspector of Police, Narcotics Cell',
    parties: [
      { role: 'Accused', name: 'Manoj Kumar', age: 27, custodyStatus: 'In Judicial Custody' },
      { role: 'Accused', name: 'Vignesh S.', age: 25, custodyStatus: 'In Judicial Custody' },
    ],
    stage: CaseStage.PROSECUTION_EVIDENCE,
    outcome: CaseOutcome.NONE,
    registeredAt: iso(-135),
    firstHearingDate: iso(-100),
    lastHearingDate: iso(-14),
    upcomingHearingDate: iso(9),
    currentCustodian: 'Registry, Special Court for NDPS Cases, Chennai',
  },
  {
    caseId: 'CASE-2024-019',
    cnrNumber: 'TNCH01-001301-2024',
    firNumber: '654/2024',
    firDate: iso(-300),
    policeStation: 'T. Nagar Police Station',
    district: 'Chennai',
    state: 'Tamil Nadu',
    title: 'Meena Sundaram vs. Ramesh Iyer',
    caseType: 'Cheating & Criminal Breach of Trust',
    sections: ['BNS 316(2)', 'BNS 318(4)'],
    description:
      'Complainant alleges the accused, a chit-fund organiser, collected ₹9.4 lakh in instalments over 14 months and absconded without disbursing the prize amount. Bank statements and WhatsApp chat exports form key documentary evidence.',
    court: 'IX Additional City Civil & Sessions Court, Chennai',
    presidingJudge: 'Hon\'ble Justice R. Kalaiselvi',
    publicProsecutor: 'Vijay Sundaram',
    defenseCounsel: 'G. Nandakumar',
    investigatingOfficer: 'S. Murugan',
    investigatingOfficerDesignation: 'Sub-Inspector of Police',
    parties: [
      { role: 'Accused', name: 'Ramesh Iyer', age: 38, custodyStatus: 'On Bail' },
      { role: 'Complainant', name: 'Meena Sundaram', address: 'West Mambalam, Chennai' },
    ],
    stage: CaseStage.FINAL_ARGUMENTS,
    outcome: CaseOutcome.NONE,
    registeredAt: iso(-295),
    firstHearingDate: iso(-260),
    lastHearingDate: iso(-6),
    upcomingHearingDate: iso(11),
    currentCustodian: 'Registry, IX Addl. City Civil & Sessions Court',
  },
  {
    caseId: 'CASE-2024-005',
    cnrNumber: 'TNCH04-000212-2024',
    firNumber: '58/2024',
    firDate: iso(-330),
    policeStation: 'All Women Police Station, Kilpauk',
    district: 'Chennai',
    state: 'Tamil Nadu',
    title: 'State vs. R. Selvakumar',
    caseType: 'Sexual Assault (POCSO)',
    sections: ['POCSO Act 4', 'POCSO Act 6', 'BNS 64'],
    description:
      'Tried in-camera before the POCSO Special Court. Victim particulars are withheld under Section 23 of the POCSO Act, 2012. Statement of the minor victim recorded under Section 183 BNSS before the Magistrate.',
    court: 'Special Court for POCSO Cases, Chennai',
    presidingJudge: 'Hon\'ble Justice Lakshmi Priya',
    publicProsecutor: 'N. Priyadarshini',
    defenseCounsel: 'G. Nandakumar',
    investigatingOfficer: 'A. Bhuvaneswari',
    investigatingOfficerDesignation: 'Inspector of Police, AWPS Kilpauk',
    parties: [
      { role: 'Accused', name: 'R. Selvakumar', age: 34, custodyStatus: 'In Judicial Custody' },
      { role: 'Victim', name: 'Minor Victim — identity protected u/s 23 POCSO Act', age: 14 },
    ],
    stage: CaseStage.PROSECUTION_EVIDENCE,
    outcome: CaseOutcome.NONE,
    registeredAt: iso(-325),
    firstHearingDate: iso(-280),
    lastHearingDate: iso(-20),
    upcomingHearingDate: iso(7),
    currentCustodian: 'Registry, Special Court for POCSO Cases, Chennai (Sealed Record)',
  },

  // ---- Case History (disposed) ----------------------------------------
  {
    caseId: 'CASE-2022-045',
    cnrNumber: 'TNCB03-000198-2022',
    firNumber: '312/2022',
    firDate: iso(-1480),
    policeStation: 'RS Puram Police Station',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    title: 'State vs. Dinesh Babu',
    caseType: 'Assault & Hurt',
    sections: ['IPC 323', 'IPC 324', 'IPC 506(i)'],
    description:
      'Accused assaulted the complainant with a wooden rod during a dispute over parking space, causing a fracture. Medical records and eyewitness testimony formed the basis of conviction.',
    court: 'Judicial Magistrate Court No. II, Coimbatore',
    presidingJudge: 'Hon\'ble Justice T. Balamurugan',
    publicProsecutor: 'N. Priyadarshini',
    defenseCounsel: 'R. Kavitha',
    investigatingOfficer: 'Karthik Venkat',
    investigatingOfficerDesignation: 'Sub-Inspector of Police',
    parties: [
      { role: 'Accused', name: 'Dinesh Babu', age: 33, custodyStatus: 'N/A' },
      { role: 'Complainant', name: 'Vetri Selvan', address: 'RS Puram, Coimbatore' },
    ],
    stage: CaseStage.DISPOSED,
    outcome: CaseOutcome.CONVICTED,
    registeredAt: iso(-1475),
    firstHearingDate: iso(-1440),
    lastHearingDate: iso(-980),
    disposedAt: iso(-980),
    currentCustodian: 'Court Record Room, JMC No. II, Coimbatore',
  },
  {
    caseId: 'CASE-2023-102',
    cnrNumber: 'TNTR05-000341-2023',
    firNumber: '145/2023',
    firDate: iso(-1120),
    policeStation: 'Srirangam Police Station',
    district: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    title: 'State vs. Ajay Kannan',
    caseType: 'Kidnapping',
    sections: ['IPC 363', 'IPC 366'],
    description:
      'Accused was alleged to have taken a minor away without consent of the lawful guardian. Trial concluded in acquittal after the prosecution witnesses turned hostile and the minor\'s statement corroborated a consensual elopement.',
    court: 'Principal District & Sessions Court, Tiruchirappalli',
    presidingJudge: 'Hon\'ble Justice S. Devendran',
    publicProsecutor: 'K. Elangovan',
    defenseCounsel: 'M. Saravanan',
    investigatingOfficer: 'P. Rajkumar',
    investigatingOfficerDesignation: 'Inspector of Police',
    parties: [
      { role: 'Accused', name: 'Ajay Kannan', age: 23, custodyStatus: 'N/A' },
      { role: 'Victim', name: 'Minor — identity withheld', age: 17 },
    ],
    stage: CaseStage.DISPOSED,
    outcome: CaseOutcome.ACQUITTED,
    registeredAt: iso(-1115),
    firstHearingDate: iso(-1080),
    lastHearingDate: iso(-560),
    disposedAt: iso(-560),
    currentCustodian: 'Court Record Room, District & Sessions Court, Tiruchirappalli',
  },
  {
    caseId: 'CASE-2021-076',
    cnrNumber: 'TNCH01-000876-2021',
    firNumber: '967/2021',
    firDate: iso(-1850),
    policeStation: 'Mylapore Police Station',
    district: 'Chennai',
    state: 'Tamil Nadu',
    title: 'State vs. Suresh Kumar',
    caseType: 'Counterfeit Currency',
    sections: ['IPC 489B', 'IPC 489C'],
    description:
      'Accused apprehended while circulating counterfeit ₹500 notes at a local market. Forensic Science Laboratory report confirmed the seized notes as counterfeit; sentenced to 5 years rigorous imprisonment.',
    court: 'IX Additional City Civil & Sessions Court, Chennai',
    presidingJudge: 'Hon\'ble Justice R. Kalaiselvi',
    publicProsecutor: 'Vijay Sundaram',
    defenseCounsel: 'Aishwarya Menon',
    investigatingOfficer: 'S. Murugan',
    investigatingOfficerDesignation: 'Sub-Inspector of Police',
    parties: [{ role: 'Accused', name: 'Suresh Kumar', age: 45, custodyStatus: 'N/A' }],
    stage: CaseStage.DISPOSED,
    outcome: CaseOutcome.CONVICTED,
    registeredAt: iso(-1845),
    firstHearingDate: iso(-1800),
    lastHearingDate: iso(-1210),
    disposedAt: iso(-1210),
    currentCustodian: 'Court Record Room, IX Addl. City Civil & Sessions Court',
  },
];

// ---------------------------------------------------------------------------
// Hearings
// ---------------------------------------------------------------------------

export const HEARINGS: Hearing[] = [
  // CASE-2024-011 — Theft
  { hearingId: 'H-011-1', caseId: 'CASE-2024-011', date: iso(-160), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Appearance', statement: 'Accused appeared on bail. Copies of chargesheet furnished under Section 230 BNSS. Case posted for framing of charges.', nextHearingDate: iso(-120), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-011-2', caseId: 'CASE-2024-011', date: iso(-120), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Framing of Charge', statement: 'Charges under BNS 303(2) and 331(4) read over and explained to the accused in Tamil. Accused pleads not guilty and claims trial.', nextHearingDate: iso(-60), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-011-3', caseId: 'CASE-2024-011', date: iso(-60), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Prosecution Evidence', statement: 'PW-1 (complainant R. Suresh Babu) examined-in-chief. Identified recovered ornaments as belonging to the showroom. Cross-examination deferred.', nextHearingDate: iso(-18), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-011-4', caseId: 'CASE-2024-011', date: iso(-18), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Cross-Examination', statement: 'PW-1 cross-examined by defence counsel. Investigating Officer (PW-4) examination-in-chief partly recorded; CCTV footage marked as Ex. P-6 subject to proof of hash integrity.', nextHearingDate: iso(12), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },

  // CASE-2024-014 — Robbery
  { hearingId: 'H-014-1', caseId: 'CASE-2024-014', date: iso(-120), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Appearance', statement: 'Accused Selvam K. and Bala Murugan produced from judicial custody. Bail application to be heard separately.', nextHearingDate: iso(-70), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-014-2', caseId: 'CASE-2024-014', date: iso(-70), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Bail Hearing', statement: 'Bail application of both accused rejected considering the gravity of offence and recovery of the weapon used.', nextHearingDate: iso(-9), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-014-3', caseId: 'CASE-2024-014', date: iso(-9), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Framing of Charge', statement: 'Charges under BNS 309(4) and 3(5) (common intention) framed against both accused. Trial to commence next hearing.', nextHearingDate: iso(19), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },

  // CASE-2023-087 — Murder
  { hearingId: 'H-087-1', caseId: 'CASE-2023-087', date: iso(-560), court: 'Principal District & Sessions Court, Madurai', judge: 'Justice R. Kalaiselvi', purpose: 'Framing of Charge', statement: 'Charge under IPC 302 r/w 34 framed. Accused pleads not guilty.', nextHearingDate: iso(-420), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-087-2', caseId: 'CASE-2023-087', date: iso(-420), court: 'Principal District & Sessions Court, Madurai', judge: 'Justice R. Kalaiselvi', purpose: 'Prosecution Evidence', statement: 'Post-mortem doctor (PW-2) and Investigating Officer (PW-6) examined. FSL report on the recovered knife marked as Ex. P-9.', nextHearingDate: iso(-200), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-087-3', caseId: 'CASE-2023-087', date: iso(-200), court: 'Principal District & Sessions Court, Madurai', judge: 'Justice R. Kalaiselvi', purpose: 'Prosecution Evidence', statement: 'Eyewitness Kamala Devi (PW-3) examined and cross-examined at length. Prosecution evidence closed.', nextHearingDate: iso(-90), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-087-4', caseId: 'CASE-2023-087', date: iso(-90), court: 'Principal District & Sessions Court, Madurai', judge: 'Justice R. Kalaiselvi', purpose: 'Defence Evidence', statement: 'Statement of accused recorded under Section 351 BNSS. Defence witness DW-1 examination commenced.', nextHearingDate: iso(-25), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-087-5', caseId: 'CASE-2023-087', date: iso(-25), court: 'Principal District & Sessions Court, Madurai', judge: 'Justice R. Kalaiselvi', purpose: 'Defence Evidence', statement: 'DW-1 cross-examined by prosecution. Defence evidence to conclude at next hearing.', nextHearingDate: iso(15), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },

  // CASE-2024-022 — Cyber Crime
  { hearingId: 'H-022-1', caseId: 'CASE-2024-022', date: iso(-40), court: 'CJM Court, Coimbatore', judge: 'Justice T. Balamurugan', purpose: 'For Orders', statement: 'Court took cognizance of the offence on the police report filed under Section 193 BNSS. Investigation for identification of remaining accused to continue.', nextHearingDate: iso(22), attendance: { prosecutor: true, defenseCounsel: false, accusedPresent: false } },

  // CASE-2024-031 — Narcotics
  { hearingId: 'H-031-1', caseId: 'CASE-2024-031', date: iso(-100), court: 'Special Court for NDPS Cases, Chennai', judge: 'Justice S. Devendran', purpose: 'Framing of Charge', statement: 'Charges under Section 20(b)(ii)(C) and 22(c) NDPS Act framed. Both accused plead not guilty.', nextHearingDate: iso(-55), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-031-2', caseId: 'CASE-2024-031', date: iso(-55), court: 'Special Court for NDPS Cases, Chennai', judge: 'Justice S. Devendran', purpose: 'Prosecution Evidence', statement: 'Seizing officer and both panch witnesses examined. Forensic Science Laboratory chemical analysis report marked as Ex. P-4.', nextHearingDate: iso(-14), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-031-3', caseId: 'CASE-2024-031', date: iso(-14), court: 'Special Court for NDPS Cases, Chennai', judge: 'Justice S. Devendran', purpose: 'Cross-Examination', statement: 'Defence cross-examined the seizing officer on compliance with Section 52A NDPS Act sampling procedure.', nextHearingDate: iso(9), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },

  // CASE-2024-019 — Cheating
  { hearingId: 'H-019-1', caseId: 'CASE-2024-019', date: iso(-260), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Framing of Charge', statement: 'Charges under BNS 316(2) and 318(4) framed against the accused.', nextHearingDate: iso(-150), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-019-2', caseId: 'CASE-2024-019', date: iso(-150), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Prosecution Evidence', statement: 'Complainant Meena Sundaram (PW-1) examined; bank statements and chat exports marked as Ex. P-2 to P-5.', nextHearingDate: iso(-60), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-019-3', caseId: 'CASE-2024-019', date: iso(-60), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Defence Evidence', statement: 'Accused examined under Section 351 BNSS. No defence witnesses proposed.', nextHearingDate: iso(-6), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-019-4', caseId: 'CASE-2024-019', date: iso(-6), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Final Arguments', statement: 'Prosecution concluded arguments. Defence sought adjournment to complete final arguments.', nextHearingDate: iso(11), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },

  // CASE-2024-005 — POCSO
  { hearingId: 'H-005-1', caseId: 'CASE-2024-005', date: iso(-280), court: 'Special Court for POCSO Cases, Chennai', judge: 'Justice Lakshmi Priya', purpose: 'Framing of Charge', statement: 'Charges under Sections 4 and 6 of the POCSO Act read with BNS 64 framed in-camera. Accused pleads not guilty.', nextHearingDate: iso(-180), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-005-2', caseId: 'CASE-2024-005', date: iso(-180), court: 'Special Court for POCSO Cases, Chennai', judge: 'Justice Lakshmi Priya', purpose: 'Prosecution Evidence', statement: 'Statement of the minor victim recorded in-camera with a support person present, as per Section 183 BNSS / Section 33 POCSO Rules. Recording sealed.', nextHearingDate: iso(-90), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-005-3', caseId: 'CASE-2024-005', date: iso(-90), court: 'Special Court for POCSO Cases, Chennai', judge: 'Justice Lakshmi Priya', purpose: 'Prosecution Evidence', statement: 'Medical examination report and FSL DNA report tendered in evidence through the examining doctor.', nextHearingDate: iso(-20), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-005-4', caseId: 'CASE-2024-005', date: iso(-20), court: 'Special Court for POCSO Cases, Chennai', judge: 'Justice Lakshmi Priya', purpose: 'Prosecution Evidence', statement: 'Investigating Officer examined. Chain of custody of biological samples verified and admitted without objection.', nextHearingDate: iso(7), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },

  // History cases
  { hearingId: 'H-045-1', caseId: 'CASE-2022-045', date: iso(-1440), court: 'JMC No. II, Coimbatore', judge: 'Justice T. Balamurugan', purpose: 'Framing of Charge', statement: 'Charges under IPC 323, 324, 506(i) framed.', nextHearingDate: iso(-1300), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-045-2', caseId: 'CASE-2022-045', date: iso(-1300), court: 'JMC No. II, Coimbatore', judge: 'Justice T. Balamurugan', purpose: 'Prosecution Evidence', statement: 'Complainant and attending doctor examined; medical certificate marked as Ex. P-2.', nextHearingDate: iso(-1050), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-045-3', caseId: 'CASE-2022-045', date: iso(-1050), court: 'JMC No. II, Coimbatore', judge: 'Justice T. Balamurugan', purpose: 'Final Arguments', statement: 'Both sides concluded arguments. Judgment reserved.', nextHearingDate: iso(-980), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-045-4', caseId: 'CASE-2022-045', date: iso(-980), court: 'JMC No. II, Coimbatore', judge: 'Justice T. Balamurugan', purpose: 'Judgment', statement: 'Accused found guilty under IPC 323 and 324. Sentenced to 1 year simple imprisonment and fine of ₹10,000. Acquitted of the charge under Section 506(i) for want of corroboration.', attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },

  { hearingId: 'H-102-1', caseId: 'CASE-2023-102', date: iso(-1080), court: 'District & Sessions Court, Tiruchirappalli', judge: 'Justice S. Devendran', purpose: 'Framing of Charge', statement: 'Charges under IPC 363 and 366 framed against the accused.', nextHearingDate: iso(-900), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-102-2', caseId: 'CASE-2023-102', date: iso(-900), court: 'District & Sessions Court, Tiruchirappalli', judge: 'Justice S. Devendran', purpose: 'Prosecution Evidence', statement: 'Key prosecution witnesses (parents of the minor) turned hostile and did not support the prosecution case.', nextHearingDate: iso(-650), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-102-3', caseId: 'CASE-2023-102', date: iso(-650), court: 'District & Sessions Court, Tiruchirappalli', judge: 'Justice S. Devendran', purpose: 'Final Arguments', statement: 'Minor\'s Section 183 BNSS statement corroborated a consensual departure. Arguments concluded.', nextHearingDate: iso(-560), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-102-4', caseId: 'CASE-2023-102', date: iso(-560), court: 'District & Sessions Court, Tiruchirappalli', judge: 'Justice S. Devendran', purpose: 'Judgment', statement: 'Prosecution failed to prove the charge beyond reasonable doubt. Accused acquitted under Section 258 BNSS.', attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },

  { hearingId: 'H-076-1', caseId: 'CASE-2021-076', date: iso(-1800), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Framing of Charge', statement: 'Charges under IPC 489B and 489C framed.', nextHearingDate: iso(-1600), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-076-2', caseId: 'CASE-2021-076', date: iso(-1600), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Prosecution Evidence', statement: 'FSL report confirming counterfeit currency notes marked as Ex. P-3. Seizing officer examined.', nextHearingDate: iso(-1350), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-076-3', caseId: 'CASE-2021-076', date: iso(-1350), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Final Arguments', statement: 'Arguments concluded on both sides. Judgment reserved.', nextHearingDate: iso(-1210), attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
  { hearingId: 'H-076-4', caseId: 'CASE-2021-076', date: iso(-1210), court: 'IX Addl. City Civil & Sessions Court', judge: 'Justice R. Kalaiselvi', purpose: 'Judgment', statement: 'Accused convicted under IPC 489B. Sentenced to 5 years rigorous imprisonment and fine of ₹25,000.', attendance: { prosecutor: true, defenseCounsel: true, accusedPresent: true } },
];

// ---------------------------------------------------------------------------
// Case Files
// ---------------------------------------------------------------------------

export const CASE_FILES: CaseFile[] = [
  // CASE-2024-011
  {
    fileId: 'DOC-011-1', caseId: 'CASE-2024-011', type: 'FIR', title: 'FIR No. 412/2024 — T. Nagar PS',
    fileFormat: 'PDF', fileSizeKb: 842, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-209),
    summary: 'First Information Report registered under BNS 303(2) on complaint of R. Suresh Babu regarding theft at Suresh Jewellers.',
    custodyTrail: trail([
      { timestamp: iso(-209), fromCustodian: 'T. Nagar PS Front Office', toCustodian: 'S. Murugan', fromRole: 'Station Records', toRole: 'Sub-Inspector', action: 'Collected' },
      { timestamp: iso(-205), fromCustodian: 'S. Murugan', toCustodian: 'CCTNS Case File', fromRole: 'Sub-Inspector', toRole: 'System', action: 'Uploaded' },
      { timestamp: iso(-160), fromCustodian: 'CCTNS Case File', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'System', toRole: 'Court Registry', action: 'Filed in Court' },
    ], 'CT-011-1'),
  },
  {
    fileId: 'DOC-011-2', caseId: 'CASE-2024-011', type: 'Consent Form / Panchnama', title: 'Scene of Crime Panchnama',
    fileFormat: 'PDF', fileSizeKb: 611, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-204),
    summary: 'Seizure memo prepared before two independent panch witnesses documenting recovery of a crowbar and broken display cabinet glass at the scene.',
    custodyTrail: trail([
      { timestamp: iso(-204), fromCustodian: 'Scene of Crime', toCustodian: 'S. Murugan', fromRole: 'Panch Witnesses', toRole: 'Sub-Inspector', action: 'Collected' },
      { timestamp: iso(-160), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' },
    ], 'CT-011-2'),
  },
  {
    fileId: 'DOC-011-3', caseId: 'CASE-2024-011', type: 'Section 63 BSA Certificate', title: 'Section 63 BSA Certificate — CCTV Footage (Ex. P-6)',
    fileFormat: 'PDF', fileSizeKb: 288, uploadedBy: 'Karthik Venkat', uploadedByRole: 'Senior Scientific Officer, TNFSL', uploadedAt: iso(-198),
    relatedSections: ['BSA Section 63'], linkedEvidenceIds: ['EV-011-D1'],
    summary: 'Certificate identifying the DVR export as an electronic record, describing the acquisition device, and recording the SHA-256 hash at the time of first extraction, signed by the forensic examiner and the device custodian.',
    custodyTrail: trail([
      { timestamp: iso(-198), fromCustodian: 'TNFSL Chennai', toCustodian: 'S. Murugan', fromRole: 'Forensics Lab', toRole: 'Sub-Inspector', action: 'Collected' },
      { timestamp: iso(-160), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' },
    ], 'CT-011-3'),
  },
  {
    fileId: 'DOC-011-4', caseId: 'CASE-2024-011', type: 'Chargesheet', title: 'Final Report u/s 193 BNSS',
    fileFormat: 'PDF', fileSizeKb: 1340, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-165),
    summary: 'Police report on completion of investigation listing 4 prosecution witnesses, sections applied, and case property. Forwarded to the jurisdictional Magistrate for cognizance.',
    custodyTrail: trail([
      { timestamp: iso(-165), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' },
      { timestamp: iso(-161), fromCustodian: 'Registry, IX Addl. Sessions Court', toCustodian: 'Vijay Sundaram', fromRole: 'Court Registry', toRole: 'Public Prosecutor', action: 'Reviewed' },
    ], 'CT-011-4'),
  },

  // CASE-2024-014
  { fileId: 'DOC-014-1', caseId: 'CASE-2024-014', type: 'FIR', title: 'FIR No. 588/2024 — Anna Nagar PS', fileFormat: 'PDF', fileSizeKb: 754, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-164), summary: 'FIR registered under BNS 309(4) on complaint of Dinesh Ramamoorthy.', custodyTrail: trail([{ timestamp: iso(-164), fromCustodian: 'Anna Nagar PS', toCustodian: 'S. Murugan', fromRole: 'Station Records', toRole: 'Sub-Inspector', action: 'Collected' }, { timestamp: iso(-120), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-014-1') },
  { fileId: 'DOC-014-2', caseId: 'CASE-2024-014', type: 'Arrest Warrant', title: 'Arrest Warrant — Selvam K. & Bala Murugan', fileFormat: 'PDF', fileSizeKb: 205, uploadedBy: 'Registry, IX Addl. Sessions Court', uploadedByRole: 'Court Registry', uploadedAt: iso(-162), summary: 'Warrant of arrest issued under Section 72 BNSS, signed by the presiding officer and bearing the court seal.', custodyTrail: trail([{ timestamp: iso(-162), fromCustodian: 'Registry, IX Addl. Sessions Court', toCustodian: 'Anna Nagar PS', fromRole: 'Court Registry', toRole: 'Station House Officer', action: 'Transferred' }], 'CT-014-2') },
  { fileId: 'DOC-014-3', caseId: 'CASE-2024-014', type: 'Request Form', title: 'Request for Test Identification Parade', fileFormat: 'PDF', fileSizeKb: 96, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-158), summary: 'Request to the jurisdictional Magistrate to conduct a Test Identification Parade of the two apprehended accused.', custodyTrail: trail([{ timestamp: iso(-158), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-014-3') },
  { fileId: 'DOC-014-4', caseId: 'CASE-2024-014', type: 'Chargesheet', title: 'Final Report u/s 193 BNSS', fileFormat: 'PDF', fileSizeKb: 1180, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-125), summary: 'Chargesheet naming Selvam K. and Bala Murugan as accused; third (minor) accused referred to the Juvenile Justice Board separately.', custodyTrail: trail([{ timestamp: iso(-125), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-014-4') },

  // CASE-2023-087
  { fileId: 'DOC-087-1', caseId: 'CASE-2023-087', type: 'FIR', title: 'FIR No. 221/2023 — Anna Nagar PS, Madurai', fileFormat: 'PDF', fileSizeKb: 690, uploadedBy: 'P. Rajkumar', uploadedByRole: 'Inspector of Police', uploadedAt: iso(-639), summary: 'FIR registered under IPC 302 on receipt of information of a homicide.', custodyTrail: trail([{ timestamp: iso(-639), fromCustodian: 'Anna Nagar PS, Madurai', toCustodian: 'P. Rajkumar', fromRole: 'Station Records', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-560), fromCustodian: 'P. Rajkumar', toCustodian: 'Registry, Sessions Court Madurai', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-087-1') },
  { fileId: 'DOC-087-2', caseId: 'CASE-2023-087', type: 'Medical / Post-mortem Report', title: 'Post-mortem Report — Muthuvel S.', fileFormat: 'PDF', fileSizeKb: 1520, uploadedBy: 'Govt. Rajaji Hospital, Madurai', uploadedByRole: 'Medical Officer', uploadedAt: iso(-636), summary: 'Confirms homicidal death due to a single penetrating stab wound to the chest.', custodyTrail: trail([{ timestamp: iso(-636), fromCustodian: 'Govt. Rajaji Hospital', toCustodian: 'P. Rajkumar', fromRole: 'Medical Officer', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-560), fromCustodian: 'P. Rajkumar', toCustodian: 'Registry, Sessions Court Madurai', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-087-2') },
  { fileId: 'DOC-087-3', caseId: 'CASE-2023-087', type: 'Search Warrant', title: 'Search Warrant — Accused Residence', fileFormat: 'PDF', fileSizeKb: 178, uploadedBy: 'Registry, Sessions Court Madurai', uploadedByRole: 'Court Registry', uploadedAt: iso(-637), summary: 'Warrant under Section 94 BNSS authorising search of the accused\'s residence for the weapon used.', custodyTrail: trail([{ timestamp: iso(-637), fromCustodian: 'Registry, Sessions Court Madurai', toCustodian: 'P. Rajkumar', fromRole: 'Court Registry', toRole: 'Inspector', action: 'Transferred' }], 'CT-087-3') },
  { fileId: 'DOC-087-4', caseId: 'CASE-2023-087', type: 'Chargesheet', title: 'Final Report u/s 173 CrPC', fileFormat: 'PDF', fileSizeKb: 2040, uploadedBy: 'P. Rajkumar', uploadedByRole: 'Inspector of Police', uploadedAt: iso(-600), summary: 'Chargesheet filed under the erstwhile Section 173 CrPC (offence predates BNSS). Lists 6 prosecution witnesses.', custodyTrail: trail([{ timestamp: iso(-600), fromCustodian: 'P. Rajkumar', toCustodian: 'Registry, Sessions Court Madurai', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-087-4') },

  // CASE-2024-022
  { fileId: 'DOC-022-1', caseId: 'CASE-2024-022', type: 'FIR', title: 'FIR No. 77/2024 — Cyber Crime PS, Coimbatore', fileFormat: 'PDF', fileSizeKb: 512, uploadedBy: 'Karthik Venkat', uploadedByRole: 'Deputy Superintendent of Police', uploadedAt: iso(-94), summary: 'FIR registered under BNS 318(4) / IT Act 66D on complaint of financial fraud via a fake investment app.', custodyTrail: trail([{ timestamp: iso(-94), fromCustodian: 'Cyber Crime PS', toCustodian: 'Karthik Venkat', fromRole: 'Station Records', toRole: 'DySP', action: 'Collected' }, { timestamp: iso(-40), fromCustodian: 'Karthik Venkat', toCustodian: 'Registry, CJM Court Coimbatore', fromRole: 'DySP', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-022-1') },
  { fileId: 'DOC-022-2', caseId: 'CASE-2024-022', type: 'Section 63 BSA Certificate', title: 'Section 63 BSA Certificate — Bank & UPI Transaction Logs', fileFormat: 'PDF', fileSizeKb: 340, uploadedBy: 'Karthik Venkat', uploadedByRole: 'Deputy Superintendent of Police', uploadedAt: iso(-85), relatedSections: ['BSA Section 63'], linkedEvidenceIds: ['EV-022-D1'], summary: 'Certificate covering transaction logs obtained from the payment gateway, with hash values recorded at the time of extraction.', custodyTrail: trail([{ timestamp: iso(-85), fromCustodian: 'Payment Gateway Nodal Officer', toCustodian: 'Karthik Venkat', fromRole: 'Nodal Officer', toRole: 'DySP', action: 'Collected' }, { timestamp: iso(-40), fromCustodian: 'Karthik Venkat', toCustodian: 'Registry, CJM Court Coimbatore', fromRole: 'DySP', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-022-2') },
  { fileId: 'DOC-022-3', caseId: 'CASE-2024-022', type: 'Request Form', title: 'Section 94 BNSS Request — CDR & IP Logs', fileFormat: 'PDF', fileSizeKb: 88, uploadedBy: 'Karthik Venkat', uploadedByRole: 'Deputy Superintendent of Police', uploadedAt: iso(-88), summary: 'Formal request to the telecom service provider for call detail records and IP login logs of the suspect number.', custodyTrail: trail([{ timestamp: iso(-88), fromCustodian: 'Karthik Venkat', toCustodian: 'Registry, CJM Court Coimbatore', fromRole: 'DySP', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-022-3') },

  // CASE-2024-031
  { fileId: 'DOC-031-1', caseId: 'CASE-2024-031', type: 'FIR', title: 'FIR No. 903/2024 — Egmore PS', fileFormat: 'PDF', fileSizeKb: 480, uploadedBy: 'A. Bhuvaneswari', uploadedByRole: 'Inspector of Police', uploadedAt: iso(-139), summary: 'FIR registered under NDPS Act Sections 20(b)(ii)(C) and 22(c).', custodyTrail: trail([{ timestamp: iso(-139), fromCustodian: 'Egmore PS', toCustodian: 'A. Bhuvaneswari', fromRole: 'Station Records', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-100), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'Registry, Special NDPS Court', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-031-1') },
  { fileId: 'DOC-031-2', caseId: 'CASE-2024-031', type: 'Consent Form / Panchnama', title: 'Seizure Panchnama — Contraband', fileFormat: 'PDF', fileSizeKb: 402, uploadedBy: 'A. Bhuvaneswari', uploadedByRole: 'Inspector of Police', uploadedAt: iso(-139), summary: 'Seizure memo prepared before two independent panch witnesses under Section 52A NDPS Act, recording weight and sampling of the contraband.', custodyTrail: trail([{ timestamp: iso(-139), fromCustodian: 'Egmore Railway Station', toCustodian: 'A. Bhuvaneswari', fromRole: 'Panch Witnesses', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-100), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'Registry, Special NDPS Court', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-031-2') },
  { fileId: 'DOC-031-3', caseId: 'CASE-2024-031', type: 'Chargesheet', title: 'Final Report u/s 193 BNSS', fileFormat: 'PDF', fileSizeKb: 990, uploadedBy: 'A. Bhuvaneswari', uploadedByRole: 'Inspector of Police', uploadedAt: iso(-105), summary: 'Chargesheet with FSL chemical analysis report annexed confirming contraband composition.', custodyTrail: trail([{ timestamp: iso(-105), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'Registry, Special NDPS Court', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-031-3') },

  // CASE-2024-019
  { fileId: 'DOC-019-1', caseId: 'CASE-2024-019', type: 'FIR', title: 'FIR No. 654/2024 — T. Nagar PS', fileFormat: 'PDF', fileSizeKb: 560, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-299), summary: 'FIR registered under BNS 316(2) on complaint of Meena Sundaram regarding a chit-fund default.', custodyTrail: trail([{ timestamp: iso(-299), fromCustodian: 'T. Nagar PS', toCustodian: 'S. Murugan', fromRole: 'Station Records', toRole: 'Sub-Inspector', action: 'Collected' }, { timestamp: iso(-260), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-019-1') },
  { fileId: 'DOC-019-2', caseId: 'CASE-2024-019', type: 'Section 63 BSA Certificate', title: 'Section 63 BSA Certificate — WhatsApp Chat Export', fileFormat: 'PDF', fileSizeKb: 260, uploadedBy: 'Karthik Venkat', uploadedByRole: 'Senior Scientific Officer, TNFSL', uploadedAt: iso(-270), relatedSections: ['BSA Section 63'], linkedEvidenceIds: ['EV-019-D1'], summary: 'Certificate for the extracted WhatsApp chat backup, describing the extraction tool used and the resulting hash value.', custodyTrail: trail([{ timestamp: iso(-270), fromCustodian: 'TNFSL Chennai', toCustodian: 'S. Murugan', fromRole: 'Forensics Lab', toRole: 'Sub-Inspector', action: 'Collected' }, { timestamp: iso(-260), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-019-2') },
  { fileId: 'DOC-019-3', caseId: 'CASE-2024-019', type: 'Chargesheet', title: 'Final Report u/s 193 BNSS', fileFormat: 'PDF', fileSizeKb: 1420, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-265), summary: 'Chargesheet listing bank statements, chat exports and 3 prosecution witnesses.', custodyTrail: trail([{ timestamp: iso(-265), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-019-3') },
  { fileId: 'DOC-019-4', caseId: 'CASE-2024-019', type: 'Court Order', title: 'Interim Order — Attachment of Bank Account', fileFormat: 'PDF', fileSizeKb: 145, uploadedBy: 'Registry, IX Addl. Sessions Court', uploadedByRole: 'Court Registry', uploadedAt: iso(-150), summary: 'Order directing provisional attachment of the accused\'s bank account pending trial.', custodyTrail: trail([{ timestamp: iso(-150), fromCustodian: 'Registry, IX Addl. Sessions Court', toCustodian: 'Case Record', fromRole: 'Court Registry', toRole: 'System', action: 'Filed in Court' }], 'CT-019-4') },

  // CASE-2024-005 (POCSO)
  { fileId: 'DOC-005-1', caseId: 'CASE-2024-005', type: 'FIR', title: 'FIR No. 58/2024 — AWPS Kilpauk (Sealed)', fileFormat: 'PDF', fileSizeKb: 300, uploadedBy: 'A. Bhuvaneswari', uploadedByRole: 'Inspector of Police', uploadedAt: iso(-329), summary: 'FIR registered under POCSO Act Sections 4 and 6. Victim identity redacted per Section 23 POCSO Act.', custodyTrail: trail([{ timestamp: iso(-329), fromCustodian: 'AWPS Kilpauk', toCustodian: 'A. Bhuvaneswari', fromRole: 'Station Records', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-280), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'Registry, POCSO Special Court', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-005-1') },
  { fileId: 'DOC-005-2', caseId: 'CASE-2024-005', type: 'Medical / Post-mortem Report', title: 'Medical Examination Report (Sealed)', fileFormat: 'PDF', fileSizeKb: 410, uploadedBy: 'Institute of Forensic Medicine, Chennai', uploadedByRole: 'Medical Officer', uploadedAt: iso(-320), summary: 'Medico-legal examination report; access restricted to the presiding judge, prosecutor and defence counsel.', custodyTrail: trail([{ timestamp: iso(-320), fromCustodian: 'Institute of Forensic Medicine', toCustodian: 'A. Bhuvaneswari', fromRole: 'Medical Officer', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-280), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'Registry, POCSO Special Court', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-005-2') },
  { fileId: 'DOC-005-3', caseId: 'CASE-2024-005', type: 'Chargesheet', title: 'Final Report u/s 193 BNSS (Sealed)', fileFormat: 'PDF', fileSizeKb: 1580, uploadedBy: 'A. Bhuvaneswari', uploadedByRole: 'Inspector of Police', uploadedAt: iso(-285), summary: 'Chargesheet filed within the statutory 2-month period prescribed under Section 19(9)/173(1B) of the POCSO Act framework.', custodyTrail: trail([{ timestamp: iso(-285), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'Registry, POCSO Special Court', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-005-3') },

  // History cases (lighter file sets)
  { fileId: 'DOC-045-1', caseId: 'CASE-2022-045', type: 'FIR', title: 'FIR No. 312/2022 — RS Puram PS', fileFormat: 'PDF', fileSizeKb: 402, uploadedBy: 'Karthik Venkat', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-1478), summary: 'FIR registered under IPC 323, 324 and 506(i).', custodyTrail: trail([{ timestamp: iso(-1478), fromCustodian: 'RS Puram PS', toCustodian: 'Karthik Venkat', fromRole: 'Station Records', toRole: 'Sub-Inspector', action: 'Collected' }, { timestamp: iso(-1440), fromCustodian: 'Karthik Venkat', toCustodian: 'Registry, JMC No. II Coimbatore', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' }, { timestamp: iso(-980), fromCustodian: 'Registry, JMC No. II Coimbatore', toCustodian: 'Court Record Room', fromRole: 'Court Registry', toRole: 'Record Room', action: 'Returned to Malkhana' }], 'CT-045-1') },
  { fileId: 'DOC-045-2', caseId: 'CASE-2022-045', type: 'Court Order', title: 'Judgment Order', fileFormat: 'PDF', fileSizeKb: 320, uploadedBy: 'Registry, JMC No. II Coimbatore', uploadedByRole: 'Court Registry', uploadedAt: iso(-980), summary: 'Final judgment convicting the accused under IPC 323 and 324; acquitted under Section 506(i).', custodyTrail: trail([{ timestamp: iso(-980), fromCustodian: 'Registry, JMC No. II Coimbatore', toCustodian: 'Court Record Room', fromRole: 'Court Registry', toRole: 'Record Room', action: 'Filed in Court' }], 'CT-045-2') },

  { fileId: 'DOC-102-1', caseId: 'CASE-2023-102', type: 'FIR', title: 'FIR No. 145/2023 — Srirangam PS', fileFormat: 'PDF', fileSizeKb: 388, uploadedBy: 'P. Rajkumar', uploadedByRole: 'Inspector of Police', uploadedAt: iso(-1118), summary: 'FIR registered under IPC 363 and 366.', custodyTrail: trail([{ timestamp: iso(-1118), fromCustodian: 'Srirangam PS', toCustodian: 'P. Rajkumar', fromRole: 'Station Records', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-1080), fromCustodian: 'P. Rajkumar', toCustodian: 'Registry, District & Sessions Court', fromRole: 'Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-102-1') },
  { fileId: 'DOC-102-2', caseId: 'CASE-2023-102', type: 'Court Order', title: 'Judgment Order — Acquittal', fileFormat: 'PDF', fileSizeKb: 298, uploadedBy: 'Registry, District & Sessions Court', uploadedByRole: 'Court Registry', uploadedAt: iso(-560), summary: 'Final judgment acquitting the accused under Section 258 BNSS.', custodyTrail: trail([{ timestamp: iso(-560), fromCustodian: 'Registry, District & Sessions Court', toCustodian: 'Court Record Room', fromRole: 'Court Registry', toRole: 'Record Room', action: 'Filed in Court' }], 'CT-102-2') },

  { fileId: 'DOC-076-1', caseId: 'CASE-2021-076', type: 'FIR', title: 'FIR No. 967/2021 — Mylapore PS', fileFormat: 'PDF', fileSizeKb: 356, uploadedBy: 'S. Murugan', uploadedByRole: 'Sub-Inspector of Police', uploadedAt: iso(-1848), summary: 'FIR registered under IPC 489B and 489C.', custodyTrail: trail([{ timestamp: iso(-1848), fromCustodian: 'Mylapore PS', toCustodian: 'S. Murugan', fromRole: 'Station Records', toRole: 'Sub-Inspector', action: 'Collected' }, { timestamp: iso(-1800), fromCustodian: 'S. Murugan', toCustodian: 'Registry, IX Addl. Sessions Court', fromRole: 'Sub-Inspector', toRole: 'Court Registry', action: 'Filed in Court' }], 'CT-076-1') },
  { fileId: 'DOC-076-2', caseId: 'CASE-2021-076', type: 'Court Order', title: 'Judgment Order — Conviction', fileFormat: 'PDF', fileSizeKb: 340, uploadedBy: 'Registry, IX Addl. Sessions Court', uploadedByRole: 'Court Registry', uploadedAt: iso(-1210), summary: 'Final judgment convicting the accused under IPC 489B; sentenced to 5 years RI.', custodyTrail: trail([{ timestamp: iso(-1210), fromCustodian: 'Registry, IX Addl. Sessions Court', toCustodian: 'Court Record Room', fromRole: 'Court Registry', toRole: 'Record Room', action: 'Filed in Court' }], 'CT-076-2') },
];

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const EVIDENCE: EvidenceItem[] = [
  // CASE-2024-011
  {
    kind: 'DIGITAL', evidenceId: 'EV-011-D1', caseId: 'CASE-2024-011', fileName: 'showroom_cctv_export.mp4', fileType: 'VIDEO',
    description: 'DVR export covering 23:40–00:20 hrs showing the break-in and removal of ornaments from the display cabinet.',
    collectedBy: 'S. Murugan', collectedByDesignation: 'Sub-Inspector of Police', collectedAt: iso(-204),
    classification: 'PRIMARY', sha256Hash: '9f2a1c7e4b3d8a0f6c5e2b1a9d8c7f6e5b4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d',
    ledgerTxId: '0x7e4b3d8a0f6c5e2b1a9d8c7f6e5b4a3c2d1e0f9a', ledgerBlockRef: 'Block #184,203', integrityStatus: 'VERIFIED', lastVerifiedAt: iso(-18),
    section63CertificateId: 'DOC-011-3', fileSizeMb: 412,
    custodyTrail: trail([
      { timestamp: iso(-204), fromCustodian: 'Showroom DVR', toCustodian: 'S. Murugan', fromRole: 'Scene of Crime', toRole: 'Sub-Inspector', action: 'Collected', notes: 'Hash computed immediately on-site; recorded as primary evidence.' },
      { timestamp: iso(-203), fromCustodian: 'S. Murugan', toCustodian: 'Karthik Venkat', fromRole: 'Sub-Inspector', toRole: 'Senior Scientific Officer', action: 'Transferred', notes: 'Handed over for forensic imaging and Section 63 certification.' },
      { timestamp: iso(-198), fromCustodian: 'Karthik Venkat', toCustodian: 'CCTNS Evidence Vault', fromRole: 'Senior Scientific Officer', toRole: 'System', action: 'Uploaded' },
    ], 'CT-EV-011-D1'),
  },
  {
    kind: 'PHYSICAL', evidenceId: 'EV-011-P1', caseId: 'CASE-2024-011', name: 'Crowbar (Iron Rod, 60cm)', category: 'Weapon',
    description: 'Recovered near the shattered display cabinet, suspected to be the tool used to force entry.',
    collectedBy: 'S. Murugan', collectedByDesignation: 'Sub-Inspector of Police', collectedAt: iso(-204),
    storageLocation: 'Malkhana, T. Nagar PS — Rack 4, Box 12', currentCustodian: 'Malkhana In-charge, T. Nagar PS', sealNumber: 'MLK/TNG/2024/0871',
    custodyTrail: trail([
      { timestamp: iso(-204), fromCustodian: 'Scene of Crime', toCustodian: 'S. Murugan', fromRole: 'Panch Witnesses', toRole: 'Sub-Inspector', action: 'Collected' },
      { timestamp: iso(-203), fromCustodian: 'S. Murugan', toCustodian: 'Malkhana In-charge, T. Nagar PS', fromRole: 'Sub-Inspector', toRole: 'Malkhana In-charge', action: 'Returned to Malkhana' },
    ], 'CT-EV-011-P1'),
  },

  // CASE-2024-014
  {
    kind: 'PHYSICAL', evidenceId: 'EV-014-P1', caseId: 'CASE-2024-014', name: 'Folding Knife (12cm blade)', category: 'Weapon',
    description: 'Weapon used to threaten the complainant, recovered from accused Selvam K. at the time of arrest.',
    collectedBy: 'S. Murugan', collectedByDesignation: 'Sub-Inspector of Police', collectedAt: iso(-121),
    storageLocation: 'Malkhana, Anna Nagar PS — Rack 2, Box 05', currentCustodian: 'Malkhana In-charge, Anna Nagar PS', sealNumber: 'MLK/ANR/2024/0442',
    custodyTrail: trail([{ timestamp: iso(-121), fromCustodian: 'Selvam K. (Accused)', toCustodian: 'S. Murugan', fromRole: 'Person Searched', toRole: 'Sub-Inspector', action: 'Collected' }, { timestamp: iso(-120), fromCustodian: 'S. Murugan', toCustodian: 'Malkhana In-charge, Anna Nagar PS', fromRole: 'Sub-Inspector', toRole: 'Malkhana In-charge', action: 'Returned to Malkhana' }], 'CT-EV-014-P1'),
  },
  {
    kind: 'DIGITAL', evidenceId: 'EV-014-D1', caseId: 'CASE-2024-014', fileName: 'traffic_signal_camera_clip.mp4', fileType: 'VIDEO', description: 'Traffic-signal camera footage placing the accused at the scene minutes before the robbery.',
    collectedBy: 'S. Murugan', collectedByDesignation: 'Sub-Inspector of Police', collectedAt: iso(-122), classification: 'SECONDARY', sha256Hash: 'b1a9d8c7f6e5b4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9',
    ledgerTxId: '0xb1a9d8c7f6e5b4a3c2d1e0f9a8b7c6d5', ledgerBlockRef: 'Block #184,096', integrityStatus: 'PENDING', fileSizeMb: 96,
    custodyTrail: trail([{ timestamp: iso(-122), fromCustodian: 'Greater Chennai Traffic Police ITMS', toCustodian: 'S. Murugan', fromRole: 'Traffic Control Room', toRole: 'Sub-Inspector', action: 'Collected', notes: 'Awaiting Section 63 BSA certification before it can be marked Primary.' }], 'CT-EV-014-D1'),
  },

  // CASE-2023-087
  {
    kind: 'PHYSICAL', evidenceId: 'EV-087-P1', caseId: 'CASE-2023-087', name: 'Blood-stained Kitchen Knife', category: 'Weapon',
    description: 'Recovered at the scene, suspected murder weapon. Bloodstains matched to the victim via FSL DNA analysis.',
    collectedBy: 'P. Rajkumar', collectedByDesignation: 'Inspector of Police', collectedAt: iso(-639),
    storageLocation: 'Malkhana, Anna Nagar PS, Madurai — Rack 1, Box 03', currentCustodian: 'Malkhana In-charge, Anna Nagar PS, Madurai', sealNumber: 'MLK/MDU/2023/0119',
    custodyTrail: trail([{ timestamp: iso(-639), fromCustodian: 'Scene of Crime', toCustodian: 'P. Rajkumar', fromRole: 'Panch Witnesses', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-636), fromCustodian: 'P. Rajkumar', toCustodian: 'TNFSL Madurai', fromRole: 'Inspector', toRole: 'Forensics Lab', action: 'Transferred', notes: 'Sent for DNA and blood-group analysis.' }, { timestamp: iso(-610), fromCustodian: 'TNFSL Madurai', toCustodian: 'Malkhana In-charge, Anna Nagar PS, Madurai', fromRole: 'Forensics Lab', toRole: 'Malkhana In-charge', action: 'Returned to Malkhana' }], 'CT-EV-087-P1'),
  },
  {
    kind: 'PHYSICAL', evidenceId: 'EV-087-P2', caseId: 'CASE-2023-087', name: 'Blood Sample (Victim)', category: 'Biological Sample',
    description: 'Blood sample collected during post-mortem examination for FSL comparison against the recovered weapon.',
    collectedBy: 'Govt. Rajaji Hospital', collectedByDesignation: 'Medical Officer', collectedAt: iso(-638),
    storageLocation: 'TNFSL Madurai — Biological Evidence Cold Storage, Shelf B2', currentCustodian: 'TNFSL Madurai', sealNumber: 'FSL/MDU/2023/BS-441',
    custodyTrail: trail([{ timestamp: iso(-638), fromCustodian: 'Govt. Rajaji Hospital', toCustodian: 'P. Rajkumar', fromRole: 'Medical Officer', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-636), fromCustodian: 'P. Rajkumar', toCustodian: 'TNFSL Madurai', fromRole: 'Inspector', toRole: 'Forensics Lab', action: 'Transferred' }], 'CT-EV-087-P2'),
  },

  // CASE-2024-022
  {
    kind: 'DIGITAL', evidenceId: 'EV-022-D1', caseId: 'CASE-2024-022', fileName: 'upi_transaction_ledger.csv', fileType: 'DOCUMENT', description: 'UPI and bank transaction logs tracing the ₹6.2 lakh transferred by the complainant to 4 mule accounts.',
    collectedBy: 'Karthik Venkat', collectedByDesignation: 'Deputy Superintendent of Police', collectedAt: iso(-88), classification: 'PRIMARY', sha256Hash: 'c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1',
    ledgerTxId: '0xc2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7', ledgerBlockRef: 'Block #189,447', integrityStatus: 'VERIFIED', lastVerifiedAt: iso(-40),
    section63CertificateId: 'DOC-022-2', fileSizeMb: 4.2,
    custodyTrail: trail([{ timestamp: iso(-88), fromCustodian: 'Payment Gateway Nodal Officer', toCustodian: 'Karthik Venkat', fromRole: 'Nodal Officer', toRole: 'DySP', action: 'Collected', notes: 'Hash computed on receipt from the nodal officer under Section 94 BNSS.' }, { timestamp: iso(-85), fromCustodian: 'Karthik Venkat', toCustodian: 'CCTNS Evidence Vault', fromRole: 'DySP', toRole: 'System', action: 'Uploaded' }], 'CT-EV-022-D1'),
  },
  {
    kind: 'DIGITAL', evidenceId: 'EV-022-D2', caseId: 'CASE-2024-022', fileName: 'fake_investment_app.apk', fileType: 'DOCUMENT', description: 'APK of the fraudulent investment application distributed to victims via WhatsApp.',
    collectedBy: 'Karthik Venkat', collectedByDesignation: 'Deputy Superintendent of Police', collectedAt: iso(-80), classification: 'SECONDARY', sha256Hash: 'd3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2',
    ledgerTxId: '0xd3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8', ledgerBlockRef: 'Block #189,690', integrityStatus: 'PENDING', fileSizeMb: 18.6,
    custodyTrail: trail([{ timestamp: iso(-80), fromCustodian: 'Complainant\'s device (imaged copy)', toCustodian: 'Karthik Venkat', fromRole: 'Complainant', toRole: 'DySP', action: 'Collected', notes: 'Section 63 certification pending; not yet linked to a certificate.' }], 'CT-EV-022-D2'),
  },

  // CASE-2024-031
  {
    kind: 'PHYSICAL', evidenceId: 'EV-031-P1', caseId: 'CASE-2024-031', name: 'Ganja — 2.1 kg (sealed packet)', category: 'Contraband',
    description: 'Cannabis seized from the travel bag carried by accused Manoj Kumar, sampled per Section 52A NDPS Act.',
    collectedBy: 'A. Bhuvaneswari', collectedByDesignation: 'Inspector of Police, Narcotics Cell', collectedAt: iso(-139),
    storageLocation: 'Malkhana, Egmore PS — Narcotics Vault, Shelf 1', currentCustodian: 'Malkhana In-charge, Egmore PS', sealNumber: 'MLK/EGM/2024/NDPS-014',
    custodyTrail: trail([{ timestamp: iso(-139), fromCustodian: 'Egmore Railway Station', toCustodian: 'A. Bhuvaneswari', fromRole: 'Panch Witnesses', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-137), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'TNFSL Chennai', fromRole: 'Inspector', toRole: 'Forensics Lab', action: 'Transferred', notes: 'Representative sample sent for chemical analysis.' }, { timestamp: iso(-120), fromCustodian: 'TNFSL Chennai', toCustodian: 'Malkhana In-charge, Egmore PS', fromRole: 'Forensics Lab', toRole: 'Malkhana In-charge', action: 'Returned to Malkhana' }], 'CT-EV-031-P1'),
  },
  {
    kind: 'PHYSICAL', evidenceId: 'EV-031-P2', caseId: 'CASE-2024-031', name: 'MDMA Tablets — 40g', category: 'Contraband',
    description: 'Synthetic MDMA tablets recovered from the same travel bag, packaged separately.',
    collectedBy: 'A. Bhuvaneswari', collectedByDesignation: 'Inspector of Police, Narcotics Cell', collectedAt: iso(-139),
    storageLocation: 'Malkhana, Egmore PS — Narcotics Vault, Shelf 1', currentCustodian: 'Malkhana In-charge, Egmore PS', sealNumber: 'MLK/EGM/2024/NDPS-015',
    custodyTrail: trail([{ timestamp: iso(-139), fromCustodian: 'Egmore Railway Station', toCustodian: 'A. Bhuvaneswari', fromRole: 'Panch Witnesses', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-120), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'Malkhana In-charge, Egmore PS', fromRole: 'Inspector', toRole: 'Malkhana In-charge', action: 'Returned to Malkhana' }], 'CT-EV-031-P2'),
  },

  // CASE-2024-019
  {
    kind: 'DIGITAL', evidenceId: 'EV-019-D1', caseId: 'CASE-2024-019', fileName: 'whatsapp_chat_export.pdf', fileType: 'DOCUMENT', description: 'WhatsApp chat backup between complainant and accused referencing the chit-fund instalments and repeated assurances.',
    collectedBy: 'S. Murugan', collectedByDesignation: 'Sub-Inspector of Police', collectedAt: iso(-272), classification: 'PRIMARY', sha256Hash: 'e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3',
    ledgerTxId: '0xe4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9', ledgerBlockRef: 'Block #171,208', integrityStatus: 'VERIFIED', lastVerifiedAt: iso(-60),
    section63CertificateId: 'DOC-019-2', fileSizeMb: 2.8,
    custodyTrail: trail([{ timestamp: iso(-272), fromCustodian: 'Complainant\'s device (imaged copy)', toCustodian: 'S. Murugan', fromRole: 'Complainant', toRole: 'Sub-Inspector', action: 'Collected', notes: 'Hash computed at time of forensic imaging.' }, { timestamp: iso(-270), fromCustodian: 'S. Murugan', toCustodian: 'Karthik Venkat', fromRole: 'Sub-Inspector', toRole: 'Senior Scientific Officer', action: 'Transferred' }], 'CT-EV-019-D1'),
  },
  {
    kind: 'DIGITAL', evidenceId: 'EV-019-D2', caseId: 'CASE-2024-019', fileName: 'bank_statement_accused.pdf', fileType: 'DOCUMENT', description: 'Accused\'s bank statement for the relevant 14-month period showing incoming instalments and subsequent withdrawals.',
    collectedBy: 'S. Murugan', collectedByDesignation: 'Sub-Inspector of Police', collectedAt: iso(-268), classification: 'PRIMARY', sha256Hash: 'f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4',
    ledgerTxId: '0xf5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0', ledgerBlockRef: 'Block #171,344', integrityStatus: 'VERIFIED', lastVerifiedAt: iso(-60), fileSizeMb: 1.1,
    custodyTrail: trail([{ timestamp: iso(-268), fromCustodian: 'Bank Nodal Officer', toCustodian: 'S. Murugan', fromRole: 'Nodal Officer', toRole: 'Sub-Inspector', action: 'Collected' }], 'CT-EV-019-D2'),
  },

  // CASE-2024-005 (POCSO — sensitive)
  {
    kind: 'PHYSICAL', evidenceId: 'EV-005-P1', caseId: 'CASE-2024-005', name: 'Biological Samples (Sealed, Restricted)', category: 'Biological Sample',
    description: 'Samples collected during medical examination for forensic DNA analysis. Access restricted per Section 23 POCSO Act.',
    collectedBy: 'Institute of Forensic Medicine, Chennai', collectedByDesignation: 'Medical Officer', collectedAt: iso(-320),
    storageLocation: 'TNFSL Chennai — Restricted Biological Vault', currentCustodian: 'TNFSL Chennai', sealNumber: 'FSL/CHN/2024/POCSO-009',
    custodyTrail: trail([{ timestamp: iso(-320), fromCustodian: 'Institute of Forensic Medicine', toCustodian: 'A. Bhuvaneswari', fromRole: 'Medical Officer', toRole: 'Inspector', action: 'Collected' }, { timestamp: iso(-318), fromCustodian: 'A. Bhuvaneswari', toCustodian: 'TNFSL Chennai', fromRole: 'Inspector', toRole: 'Forensics Lab', action: 'Transferred' }], 'CT-EV-005-P1'),
  },
  {
    kind: 'DIGITAL', evidenceId: 'EV-005-D1', caseId: 'CASE-2024-005', fileName: 'victim_statement_183bnss.mp4', fileType: 'VIDEO', description: 'Video-recorded statement of the minor victim under Section 183 BNSS. Access restricted to the court and both counsels.',
    collectedBy: 'A. Bhuvaneswari', collectedByDesignation: 'Inspector of Police', collectedAt: iso(-180), classification: 'PRIMARY', sha256Hash: 'a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5',
    ledgerTxId: '0xa6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1', ledgerBlockRef: 'Block #166,552', integrityStatus: 'VERIFIED', lastVerifiedAt: iso(-90), fileSizeMb: 210,
    custodyTrail: trail([{ timestamp: iso(-180), fromCustodian: 'Recording (in-camera)', toCustodian: 'A. Bhuvaneswari', fromRole: 'Magistrate Chamber', toRole: 'Inspector', action: 'Collected', notes: 'Sealed and hashed immediately after recording.' }], 'CT-EV-005-D1'),
  },

  // History cases
  { kind: 'PHYSICAL', evidenceId: 'EV-045-P1', caseId: 'CASE-2022-045', name: 'Wooden Rod (Assault Weapon)', category: 'Weapon', description: 'Recovered from the accused at the time of arrest.', collectedBy: 'Karthik Venkat', collectedByDesignation: 'Sub-Inspector of Police', collectedAt: iso(-1478), storageLocation: 'Court Record Room, JMC No. II Coimbatore — Disposed Property Shelf', currentCustodian: 'Court Record Room', sealNumber: 'MLK/RSP/2022/0067', custodyTrail: trail([{ timestamp: iso(-1478), fromCustodian: 'Accused', toCustodian: 'Karthik Venkat', fromRole: 'Person Searched', toRole: 'Sub-Inspector', action: 'Collected' }, { timestamp: iso(-980), fromCustodian: 'Malkhana, RS Puram PS', toCustodian: 'Court Record Room', fromRole: 'Malkhana In-charge', toRole: 'Record Room', action: 'Returned to Malkhana', notes: 'Case disposed; property retained pending appeal period.' }], 'CT-EV-045-P1') },

  { kind: 'DIGITAL', evidenceId: 'EV-102-D1', caseId: 'CASE-2023-102', fileName: 'mobile_tower_dump_data.csv', fileType: 'CALL_DETAIL_RECORD', description: 'Cell tower dump data used to trace the movement of the accused and minor around the time of the incident.', collectedBy: 'P. Rajkumar', collectedByDesignation: 'Inspector of Police', collectedAt: iso(-1110), classification: 'PRIMARY', sha256Hash: 'b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6', ledgerTxId: '0xb7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2', ledgerBlockRef: 'Block #98,213', integrityStatus: 'VERIFIED', lastVerifiedAt: iso(-650), fileSizeMb: 6.4, custodyTrail: trail([{ timestamp: iso(-1110), fromCustodian: 'Telecom Nodal Officer', toCustodian: 'P. Rajkumar', fromRole: 'Nodal Officer', toRole: 'Inspector', action: 'Collected' }], 'CT-EV-102-D1') },

  { kind: 'PHYSICAL', evidenceId: 'EV-076-P1', caseId: 'CASE-2021-076', name: 'Counterfeit ₹500 Notes (18 pieces)', category: 'Currency', description: 'Counterfeit currency notes seized at the point of circulation, confirmed counterfeit by FSL.', collectedBy: 'S. Murugan', collectedByDesignation: 'Sub-Inspector of Police', collectedAt: iso(-1848), storageLocation: 'Court Record Room, IX Addl. Sessions Court — Disposed Property Shelf', currentCustodian: 'Court Record Room', sealNumber: 'MLK/MYL/2021/0034', custodyTrail: trail([{ timestamp: iso(-1848), fromCustodian: 'Scene of Circulation', toCustodian: 'S. Murugan', fromRole: 'Panch Witnesses', toRole: 'Sub-Inspector', action: 'Collected' }, { timestamp: iso(-1210), fromCustodian: 'Registry, IX Addl. Sessions Court', toCustodian: 'Court Record Room', fromRole: 'Court Registry', toRole: 'Record Room', action: 'Returned to Malkhana', notes: 'Case disposed; retained as convicted property.' }], 'CT-EV-076-P1') },
];

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

let logCounter = 0;
const log = (
  caseId: string,
  offsetDays: number,
  actorName: string,
  actorDesignation: string,
  action: AuditLogEntry['action'],
  targetLabel: string,
  ipAddress = '10.24.6.',
  device = 'Chrome · Court Workstation',
): AuditLogEntry => {
  logCounter += 1;
  return {
    logId: `LOG-${String(logCounter).padStart(4, '0')}`,
    caseId,
    timestamp: iso(offsetDays, 9 + (logCounter % 8), (logCounter * 7) % 60),
    actorName,
    actorDesignation,
    action,
    targetLabel,
    ipAddress: ipAddress + (10 + (logCounter % 200)),
    device,
  };
};

export const AUDIT_LOGS: AuditLogEntry[] = [
  ...['CASE-2024-011'].flatMap((c) => [
    log(c, -160, 'S. Murugan', 'Sub-Inspector of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -161, 'Vijay Sundaram', 'Public Prosecutor', 'CASE_VIEWED', 'Opened case for review'),
    log(c, -198, 'Karthik Venkat', 'Senior Scientific Officer, TNFSL', 'EVIDENCE_UPLOADED', 'EV-011-D1 — showroom_cctv_export.mp4'),
    log(c, -60, 'Aishwarya Menon', 'Defense Counsel', 'FILE_VIEWED', 'DOC-011-4 — Final Report u/s 193 BNSS'),
    log(c, -18, 'Vijay Sundaram', 'Public Prosecutor', 'EVIDENCE_VERIFIED', 'EV-011-D1 — hash re-verified against ledger'),
    log(c, -18, 'Justice R. Kalaiselvi', 'District Judge', 'HEARING_RECORDED', 'Cross-Examination hearing minutes recorded'),
    log(c, -2, 'Vijay Sundaram', 'Public Prosecutor', 'FILE_DOWNLOADED', 'DOC-011-3 — Section 63 BSA Certificate'),
  ]),
  ...['CASE-2024-014'].flatMap((c) => [
    log(c, -162, 'S. Murugan', 'Sub-Inspector of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -125, 'Vijay Sundaram', 'Public Prosecutor', 'FILE_VIEWED', 'DOC-014-4 — Final Report u/s 193 BNSS'),
    log(c, -120, 'S. Murugan', 'Sub-Inspector of Police', 'EVIDENCE_UPLOADED', 'EV-014-D1 — traffic_signal_camera_clip.mp4'),
    log(c, -70, 'Justice R. Kalaiselvi', 'District Judge', 'HEARING_RECORDED', 'Bail Hearing minutes recorded'),
    log(c, -9, 'Aishwarya Menon', 'Defense Counsel', 'EVIDENCE_VIEWED', 'EV-014-P1 — Folding Knife (12cm blade)'),
  ]),
  ...['CASE-2023-087'].flatMap((c) => [
    log(c, -560, 'P. Rajkumar', 'Inspector of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -638, 'Karthik Venkat', 'Senior Scientific Officer, TNFSL', 'EVIDENCE_UPLOADED', 'EV-087-P2 — Blood Sample (Victim)'),
    log(c, -420, 'Vijay Sundaram', 'Public Prosecutor', 'FILE_VIEWED', 'DOC-087-2 — Post-mortem Report'),
    log(c, -200, 'Justice R. Kalaiselvi', 'District Judge', 'HEARING_RECORDED', 'Prosecution Evidence hearing minutes recorded'),
    log(c, -25, 'M. Saravanan', 'Defense Counsel', 'EVIDENCE_VIEWED', 'EV-087-P1 — Blood-stained Kitchen Knife'),
  ]),
  ...['CASE-2024-022'].flatMap((c) => [
    log(c, -90, 'Karthik Venkat', 'Deputy Superintendent of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -85, 'Karthik Venkat', 'Deputy Superintendent of Police', 'EVIDENCE_UPLOADED', 'EV-022-D1 — upi_transaction_ledger.csv'),
    log(c, -40, 'N. Priyadarshini', 'Public Prosecutor', 'FILE_VIEWED', 'DOC-022-1 — FIR No. 77/2024'),
    log(c, -40, 'N. Priyadarshini', 'Public Prosecutor', 'EVIDENCE_VERIFIED', 'EV-022-D1 — hash verified against ledger'),
  ]),
  ...['CASE-2024-031'].flatMap((c) => [
    log(c, -100, 'A. Bhuvaneswari', 'Inspector of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -139, 'A. Bhuvaneswari', 'Inspector of Police', 'EVIDENCE_UPLOADED', 'EV-031-P1 — Ganja — 2.1 kg (sealed packet)'),
    log(c, -55, 'Vijay Sundaram', 'Public Prosecutor', 'CASE_VIEWED', 'Opened case for review'),
    log(c, -14, 'R. Kavitha', 'Defense Counsel', 'FILE_VIEWED', 'DOC-031-2 — Seizure Panchnama'),
  ]),
  ...['CASE-2024-019'].flatMap((c) => [
    log(c, -260, 'S. Murugan', 'Sub-Inspector of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -270, 'Karthik Venkat', 'Senior Scientific Officer, TNFSL', 'EVIDENCE_UPLOADED', 'EV-019-D1 — whatsapp_chat_export.pdf'),
    log(c, -150, 'Vijay Sundaram', 'Public Prosecutor', 'EVIDENCE_VIEWED', 'EV-019-D2 — bank_statement_accused.pdf'),
    log(c, -60, 'G. Nandakumar', 'Defense Counsel', 'FILE_VIEWED', 'DOC-019-3 — Final Report u/s 193 BNSS'),
    log(c, -6, 'Vijay Sundaram', 'Public Prosecutor', 'EVIDENCE_VERIFIED', 'EV-019-D1 — hash re-verified against ledger'),
  ]),
  ...['CASE-2024-005'].flatMap((c) => [
    log(c, -280, 'A. Bhuvaneswari', 'Inspector of Police', 'CASE_CREATED', 'Case filed in court registry (sealed record)'),
    log(c, -320, 'Institute of Forensic Medicine', 'Medical Officer', 'EVIDENCE_UPLOADED', 'EV-005-P1 — Biological Samples (Sealed, Restricted)'),
    log(c, -180, 'Justice Lakshmi Priya', 'District Judge', 'HEARING_RECORDED', 'In-camera statement recorded under Section 183 BNSS'),
    log(c, -90, 'N. Priyadarshini', 'Public Prosecutor', 'FILE_VIEWED', 'DOC-005-2 — Medical Examination Report (Sealed)', '10.24.9.'),
    log(c, -20, 'G. Nandakumar', 'Defense Counsel', 'EVIDENCE_VIEWED', 'EV-005-D1 — victim_statement_183bnss.mp4', '10.24.9.'),
  ]),
  ...['CASE-2022-045'].flatMap((c) => [
    log(c, -1478, 'Karthik Venkat', 'Sub-Inspector of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -980, 'Justice T. Balamurugan', 'Judicial Magistrate', 'HEARING_RECORDED', 'Judgment pronounced'),
    log(c, -970, 'Vijay Sundaram', 'Public Prosecutor', 'CASE_VIEWED', 'Reviewed disposed case record'),
  ]),
  ...['CASE-2023-102'].flatMap((c) => [
    log(c, -1115, 'P. Rajkumar', 'Inspector of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -560, 'Justice S. Devendran', 'District Judge', 'HEARING_RECORDED', 'Judgment pronounced — acquittal'),
    log(c, -300, 'K. Elangovan', 'Public Prosecutor', 'CASE_VIEWED', 'Reviewed disposed case record for appeal assessment'),
  ]),
  ...['CASE-2021-076'].flatMap((c) => [
    log(c, -1845, 'S. Murugan', 'Sub-Inspector of Police', 'CASE_CREATED', 'Case filed in court registry'),
    log(c, -1210, 'Justice R. Kalaiselvi', 'District Judge', 'HEARING_RECORDED', 'Judgment pronounced — conviction'),
    log(c, -100, 'Vijay Sundaram', 'Public Prosecutor', 'CASE_VIEWED', 'Reviewed disposed case record'),
  ]),
];

// ---------------------------------------------------------------------------
// Convenience getters
// ---------------------------------------------------------------------------

export const getCaseById = (caseId: string) => CASES.find((c) => c.caseId === caseId);
export const getHearingsForCase = (caseId: string) =>
  HEARINGS.filter((h) => h.caseId === caseId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
export const getFilesForCase = (caseId: string) =>
  CASE_FILES.filter((f) => f.caseId === caseId).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
export const getEvidenceForCase = (caseId: string) => EVIDENCE.filter((e) => e.caseId === caseId);
export const getLogsForCase = (caseId: string) =>
  AUDIT_LOGS.filter((l) => l.caseId === caseId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
