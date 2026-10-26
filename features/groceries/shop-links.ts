/**
 * Online shopping links. For now only Amazon.ca, for families who use
 * Canadian dollars; elsewhere no buy links are shown and the rest of Firdam is
 * unchanged. Adding a country later means adding a shop here. Shared by the
 * website and the phone app (the app gets a copy via mobile/scripts/sync-shared.mjs).
 */

export const AMAZON_CA_TAG = 'firdam-20';

/** Amazon requires this sentence wherever its links appear. */
export const AFFILIATE_NOTE = 'As an Amazon Associate, Firdam earns from qualifying purchases.';

/** True for the phone's or browser's time zone when it is in Canada. */
export function isCanadianTimeZone(timeZone: string | null | undefined): boolean {
  return !!timeZone && CANADIAN_TIME_ZONES.has(timeZone);
}

const CANADIAN_TIME_ZONES = new Set([
  'America/St_Johns', 'America/Halifax', 'America/Glace_Bay', 'America/Moncton', 'America/Goose_Bay',
  'America/Toronto', 'America/Montreal', 'America/Nipigon', 'America/Thunder_Bay', 'America/Iqaluit',
  'America/Winnipeg', 'America/Rainy_River', 'America/Rankin_Inlet', 'America/Resolute', 'America/Regina',
  'America/Swift_Current', 'America/Edmonton', 'America/Cambridge_Bay', 'America/Yellowknife', 'America/Inuvik',
  'America/Vancouver', 'America/Whitehorse', 'America/Dawson', 'America/Dawson_Creek', 'America/Fort_Nelson',
  'America/Creston', 'America/Atikokan', 'America/Blanc-Sablon',
]);

/** The device's time zone, or null if it can't be read. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Buy links are shown only where Firdam has a shop partner (Canada for now):
 * families who chose Canadian dollars, or whose device is set to a Canadian
 * time zone (browsers often say "English (US)" in Canada, so language alone
 * isn't enough).
 */
export function shopsAvailable(currency: string | null | undefined, timeZone: string | null | undefined = deviceTimeZone()): boolean {
  return currency === 'CAD' || isCanadianTimeZone(timeZone);
}

/** Amazon.ca search for `query`, optionally only up to `maxPrice` dollars, with Firdam's tag. */
export function amazonSearchUrl(query: string, maxPrice?: number | null): string {
  const params = new URLSearchParams({ k: query.trim(), tag: AMAZON_CA_TAG });
  if (maxPrice && maxPrice > 0) params.set('rh', `p_36:-${Math.round(maxPrice * 100)}`);
  return `https://www.amazon.ca/s?${params.toString()}`;
}

/** Fresh food is better bought locally, so these grocery aisles get no Amazon link. */
const FRESH = new Set(['Fruits', 'Vegetables', 'Meat', 'Poultry', 'Seafood', 'Dairy', 'Eggs', 'Bakery', 'Frozen Foods']);

export function canBuyOnline(category: string | null | undefined): boolean {
  return !!category && !FRESH.has(category);
}

/** Quick searches for each department (beyond groceries). */
export const DEPARTMENT_PICKS: Record<string, { label: string; query: string }[]> = {
  household: [
    { label: 'Dish soap', query: 'dish soap' },
    { label: 'Laundry detergent', query: 'laundry detergent' },
    { label: 'Paper towels', query: 'paper towels' },
    { label: 'Food storage containers', query: 'food storage containers' },
    { label: 'Spice rack', query: 'spice rack organizer' },
  ],
  clothing: [
    { label: 'Abaya', query: 'abaya women' },
    { label: 'Hijab', query: 'hijab' },
    { label: 'Thobe', query: 'thobe men' },
    { label: 'Kids’ hijab', query: 'kids hijab girls' },
    { label: 'Prayer clothes', query: 'prayer dress women' },
  ],
  kids: [
    { label: 'School backpack', query: 'kids school backpack' },
    { label: 'Lunch box', query: 'kids lunch box' },
    { label: 'Arabic alphabet', query: 'arabic alphabet book kids' },
    { label: 'Islamic stories', query: 'islamic stories for kids book' },
    { label: 'Kids’ prayer mat', query: 'kids prayer mat' },
  ],
  gifts: [
    { label: 'Eid decorations', query: 'eid mubarak decorations' },
    { label: 'Eid gift bags', query: 'eid gift bags' },
    { label: 'Prayer mat', query: 'prayer mat' },
    { label: 'Quran stand', query: 'quran stand rehal' },
    { label: 'Ramadan lantern', query: 'ramadan lantern' },
  ],
};

/** A typed budget ("40", "39.99", "$40") as a number, or null when empty or invalid. */
export function parseBudget(v: string): number | null {
  const n = Number(v.replace(/[$,\s]/g, ''));
  return v.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

/** Aisles best bought from a halal butcher. */
const BUTCHER = new Set(['Meat', 'Poultry', 'Seafood']);

/**
 * "Your list has chicken and lamb: find a halal butcher near you". Works in
 * every country (it opens Halal places, not a shop).
 */
export function nearYouHint(groups: { category: string; items: { name: string }[] }[]): {
  meat: string[];
  hasOther: boolean;
} | null {
  const meat = groups.filter((g) => BUTCHER.has(g.category)).flatMap((g) => g.items.map((i) => i.name));
  const hasOther = groups.some((g) => !BUTCHER.has(g.category) && g.items.length > 0);
  return meat.length || hasOther ? { meat, hasOther } : null;
}

/** "chicken, lamb and beef" (at most three names, then "and 2 more"). */
export function listNames(names: string[]): string {
  const lower = names.map((n) => n.toLowerCase());
  if (lower.length <= 1) return lower.join('');
  if (lower.length <= 3) return `${lower.slice(0, -1).join(', ')} and ${lower[lower.length - 1]}`;
  return `${lower.slice(0, 3).join(', ')} and ${lower.length - 3} more`;
}
