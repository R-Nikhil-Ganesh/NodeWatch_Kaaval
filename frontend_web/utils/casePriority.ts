import { Case } from '../types';

// ---------------------------------------------------------------------------
// Case priority triage
//
// Two independent signals decide how urgently a case needs attention:
//  1. A manual admin override (the "Priority" toggle at case creation) —
//     always wins, since a human investigator's judgment call should never
//     be second-guessed by a keyword scan.
//  2. An automatic keyword scan of the case title + description, modelled
//     on the categories NCRB (National Crime Records Bureau) tracks as
//     "heinous crimes" in its annual Crime in India report — offences
//     against the human body (murder, culpable homicide), sexual offences
//     against women and children (rape, POCSO), and other crimes the
//     Bharatiya Nyaya Sanhita treats with the heaviest sentencing (dowry
//     death, acid attack, trafficking, terrorism). These get triaged above
//     everything else regardless of who created the case or whether they
//     remembered to flag it manually.
//
// This is intentionally a flat two-tier severity scale (CRITICAL / HIGH /
// STANDARD) rather than a deep taxonomy — for a duty officer scanning a
// dashboard, "what do I look at first" only needs a few buckets, not a
// crime-code hierarchy.
// ---------------------------------------------------------------------------

export type PriorityTier = 'CRITICAL' | 'HIGH' | 'STANDARD';

// Crimes against life, and sexual/violent offences against women and
// children — NCRB's core "heinous crime" categories.
const CRITICAL_KEYWORDS = [
  'murder', 'homicide', 'culpable homicide', 'attempt to murder', 'attempted murder',
  'rape', 'gang rape', 'sexual assault', 'sexual abuse',
  'pocso', 'child abuse', 'child sexual abuse', 'child sexual assault', 'minor victim', 'child trafficking',
  'women abuse', 'domestic violence', 'dowry death', 'dowry harassment', 'honour killing', 'honor killing',
  'acid attack', 'human trafficking', 'trafficking',
  'kidnap', 'kidnapping', 'abduction',
  'terrorism', 'terrorist', 'bomb', 'explosive',
  'custodial death', 'custodial violence', 'custodial torture',
];

// Serious offences that warrant elevated attention but sit a tier below
// crimes against life/body.
const HIGH_KEYWORDS = [
  'molestation', 'harassment', 'stalking', 'eve teasing',
  'robbery', 'dacoity', 'armed robbery', 'extortion',
  'narcotics', 'ndps', 'drug trafficking', 'drug smuggling',
  'firearm', 'illegal weapons', 'arson',
  'communal violence', 'riot', 'mob violence',
  'counterfeit currency', 'cyber fraud', 'cyber crime',
];

const buildMatcher = (keywords: string[]) => {
  const pattern = keywords
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // escape regex specials
    .join('|');
  return new RegExp(`\\b(${pattern})\\b`, 'i');
};

const CRITICAL_PATTERN = buildMatcher(CRITICAL_KEYWORDS);
const HIGH_PATTERN = buildMatcher(HIGH_KEYWORDS);

/** Scans free text (title/description) for heinous-crime and serious-crime keywords. */
export const detectKeywordTier = (text: string): PriorityTier => {
  if (!text) return 'STANDARD';
  if (CRITICAL_PATTERN.test(text)) return 'CRITICAL';
  if (HIGH_PATTERN.test(text)) return 'HIGH';
  return 'STANDARD';
};

/** A manual priority flag always outranks the keyword scan. */
export const getCasePriorityTier = (c: Pick<Case, 'title' | 'description' | 'priority'>): PriorityTier => {
  if (c.priority) return 'CRITICAL';
  return detectKeywordTier(`${c.title || ''} ${c.description || ''}`);
};

const TIER_RANK: Record<PriorityTier, number> = { CRITICAL: 0, HIGH: 1, STANDARD: 2 };

export const TIER_LABEL: Record<PriorityTier, string> = {
  CRITICAL: 'Critical Priority',
  HIGH: 'High Priority',
  STANDARD: 'Standard',
};

// Maps each tier to a Badge `color` prop (see components/Common.tsx).
export const TIER_BADGE_COLOR: Record<PriorityTier, 'red' | 'yellow' | 'gray'> = {
  CRITICAL: 'red',
  HIGH: 'yellow',
  STANDARD: 'gray',
};

/**
 * Sorts cases into the priority hierarchy: manually-flagged and
 * keyword-detected CRITICAL cases first, then HIGH, then everything else —
 * newest first within each tier.
 */
export const sortCasesByPriority = <T extends Pick<Case, 'title' | 'description' | 'priority' | 'createdAt'>>(cases: T[]): T[] => {
  return [...cases].sort((a, b) => {
    const rankDiff = TIER_RANK[getCasePriorityTier(a)] - TIER_RANK[getCasePriorityTier(b)];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};
