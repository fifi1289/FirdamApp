// GENERATED from features/newcomer/newcomer-core.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * Newcomer: a family's first-year plan in a new country. Shared by the website
 * and the phone app (the app gets a copy via mobile/scripts/sync-shared.mjs).
 * Content per country lives beside this file (newcomer-canada.ts); the family's
 * progress lives in the newcomer_plans / newcomer_steps tables.
 */
export type NewcomerLang = 'en' | 'fr' | 'ar';
export type NewcomerText = Record<NewcomerLang, string>;
export type NewcomerStatus = 'pr' | 'work' | 'study' | 'refugee' | 'sponsor';
export type NewcomerPhase = 'before' | 'week' | 'month' | 'three' | 'six' | 'year';

export interface NewcomerLink {
  label: string;
  url: string;
}

export interface NewcomerStep {
  key: string;
  phase: NewcomerPhase;
  /** Who usually does it: each adult, once for the family, or anyone. */
  who: 'each-adult' | 'family' | 'anyone';
  /** Only for these statuses (default: all). */
  statuses?: NewcomerStatus[];
  /** Only for families with children under 18. */
  kids?: boolean;
  urgent?: boolean;
  title: NewcomerText;
  why: NewcomerText;
  how: NewcomerText[];
  bring?: NewcomerText;
  cost?: 'free' | 'paid';
  link?: NewcomerLink;
  /** Another Firdam feature that helps with this step. */
  feature?: 'halal';
  /** Opens a tab of the Newcomer screen. */
  opens?: 'discounts' | 'around';
  /** What to search on a map for the nearest office (English), for "Get directions". */
  place?: string;
  /** Roughly how long it takes. */
  takes?: NewcomerText;
  /** Practical tips from Firdam. */
  tips?: NewcomerText[];
  /** Province/state rules that replace or add to the general text. */
  byRegion?: Record<string, { title?: NewcomerText; note?: NewcomerText; link?: NewcomerLink }>;
}

export interface NewcomerHelp {
  kind: 'free' | 'discount' | 'deal';
  key: string;
  title: NewcomerText;
  text: NewcomerText;
  who: NewcomerText;
  link?: string;
  regions?: string[];
  cities?: string[];
  feature?: 'halal';
}

/** A city's public transit, for Getting around. */
export interface NewcomerTransit {
  city: string;
  region: string;
  agency: string;
  url: string;
}

export interface NewcomerCountry {
  code: string;
  transit?: NewcomerTransit[];
  name: NewcomerText;
  regions: { code: string; name: NewcomerText }[];
  statuses: { id: NewcomerStatus; name: NewcomerText }[];
  steps: NewcomerStep[];
  help: NewcomerHelp[];
  checked: string;
}

export interface NewcomerPlan {
  id: string;
  country: string;
  region: string | null;
  city: string | null;
  status: NewcomerStatus;
  arrival_date: string | null;
}

export interface NewcomerStepRow {
  id: string;
  plan_id: string;
  step_key: string;
  assignee: string | null;
  done_at: string | null;
  done_by: string | null;
  note: string | null;
}

export const NEWCOMER_PHASES: { id: NewcomerPhase; label: string; fromDay: number }[] = [
  { id: 'before', label: 'Before you land', fromDay: -Infinity },
  { id: 'week', label: 'First week', fromDay: 0 },
  { id: 'month', label: 'First month', fromDay: 7 },
  { id: 'three', label: 'First 3 months', fromDay: 30 },
  { id: 'six', label: 'First 6 months', fromDay: 90 },
  { id: 'year', label: 'First year', fromDay: 180 },
];

/** Picks the family's language, falling back to English. */
export const pick = (text: NewcomerText | undefined, lang: NewcomerLang): string => (text ? text[lang] || text.en : '');

/** Whole days since arrival (negative before landing), or null without a date. */
export function daysInCountry(arrival: string | null, today: Date = new Date()): number | null {
  if (!arrival || !/^\d{4}-\d{2}-\d{2}/.test(arrival)) return null;
  const [y, m, d] = arrival.slice(0, 10).split('-').map(Number);
  const start = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((now - start) / 86_400_000);
}

/** Which part of the plan the family is in now. */
export function currentPhase(arrival: string | null, today: Date = new Date()): NewcomerPhase {
  const days = daysInCountry(arrival, today);
  if (days === null) return 'week';
  let phase: NewcomerPhase = 'before';
  for (const p of NEWCOMER_PHASES) if (days >= p.fromDay) phase = p.id;
  return phase;
}

/** The steps that apply to this family, in order. */
export function stepsFor(country: NewcomerCountry, plan: Pick<NewcomerPlan, 'status'>, hasKids: boolean): NewcomerStep[] {
  return country.steps.filter((s) => (!s.statuses || s.statuses.includes(plan.status)) && (!s.kids || hasKids));
}

/** A step's title, note and link for the family's province. */
export function stepView(step: NewcomerStep, region: string | null, lang: NewcomerLang) {
  const local = region ? step.byRegion?.[region] : undefined;
  return {
    title: pick(local?.title ?? step.title, lang),
    why: pick(step.why, lang),
    note: local?.note ? pick(local.note, lang) : null,
    how: step.how.map((h) => pick(h, lang)),
    bring: step.bring ? pick(step.bring, lang) : null,
    link: local?.link ?? step.link ?? null,
    takes: step.takes ? pick(step.takes, lang) : null,
    tips: (step.tips ?? []).map((x) => pick(x, lang)),
  };
}

/** Help items for the family's province and city. */
export function helpFor(country: NewcomerCountry, plan: Pick<NewcomerPlan, 'region' | 'city'>, kind: NewcomerHelp['kind']): NewcomerHelp[] {
  const city = (plan.city ?? '').trim().toLowerCase();
  return country.help.filter(
    (h) =>
      h.kind === kind &&
      (!h.regions || (plan.region !== null && h.regions.includes(plan.region))) &&
      (!h.cities || h.cities.some((c) => c.toLowerCase() === city)),
  );
}

/** Progress across the family's steps. */
export function progress(steps: NewcomerStep[], rows: NewcomerStepRow[]): { done: number; total: number } {
  const done = new Set(rows.filter((r) => r.done_at).map((r) => r.step_key));
  return { done: steps.filter((s) => done.has(s.key)).length, total: steps.length };
}

/** The first step not yet done, starting from the family's current phase. */
export function nextStep(steps: NewcomerStep[], rows: NewcomerStepRow[], phase: NewcomerPhase): NewcomerStep | null {
  const done = new Set(rows.filter((r) => r.done_at).map((r) => r.step_key));
  const order = NEWCOMER_PHASES.map((p) => p.id);
  const from = order.indexOf(phase);
  // Once the family has landed, "before you land" steps are no longer suggested.
  const open = steps.filter((s) => !done.has(s.key) && (phase === 'before' || s.phase !== 'before'));
  // Overdue first (earlier phases), urgent before the rest.
  const sorted = open.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase) || Number(!!b.urgent) - Number(!!a.urgent));
  return sorted.find((s) => order.indexOf(s.phase) <= from) ?? sorted[0] ?? null;
}

/** Google Maps directions by public transit to the nearest place of a kind ("Service Canada Centre Ottawa ON Canada"). */
export function directionsUrl(place: string, plan: Pick<NewcomerPlan, 'city' | 'region' | 'country'>, mode: 'transit' | 'driving' | 'walking' = 'transit'): string {
  const where = [place, plan.city, plan.region, plan.country === 'CA' ? 'Canada' : plan.country].filter(Boolean).join(' ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where)}&travelmode=${mode}`;
}

/** Google Maps ready to plan a trip by public transit from where you are (live bus times where the city shares them). */
export function tripPlannerUrl(): string {
  return 'https://www.google.com/maps/dir/?api=1&travelmode=transit';
}

/** The transit agency for the family's city, if Firdam knows it. */
export function transitFor(country: NewcomerCountry, plan: Pick<NewcomerPlan, 'city'>): NewcomerTransit | null {
  const city = (plan.city ?? '').trim().toLowerCase();
  return country.transit?.find((x) => x.city.toLowerCase() === city) ?? null;
}
