import { tr } from '@/lib/i18n';
/**
 * Online shopping links: Amazon, in the family's own country store (worldwide).
 * Firdam earns a commission only where it has an Associates tag (Amazon.ca for
 * now); other stores get a plain link and no affiliate note. Adding a country's
 * tag later means adding it to AMAZON_TAGS. Shared by the website and the phone
 * app (the app gets a copy via mobile/scripts/sync-shared.mjs).
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

/** Amazon links are shown everywhere: every family gets the Amazon store for their country. */
export function shopsAvailable(_currency?: string | null, _timeZone?: string | null): boolean {
  return true;
}

/** Amazon search in the family's store for `query`, optionally up to `maxPrice` (their currency), with Firdam's tag where it has one. */
export function amazonSearchUrl(
  query: string,
  maxPrice?: number | null,
  currency?: string | null,
  timeZone: string | null | undefined = deviceTimeZone(),
): string {
  const host = amazonStoreFor(currency, timeZone);
  const params = new URLSearchParams({ k: query.trim() });
  const tag = AMAZON_TAGS[host];
  if (tag) params.set('tag', tag);
  if (maxPrice && maxPrice > 0) params.set('rh', `p_36:-${Math.round(maxPrice * 100)}`);
  return `https://${host}/s?${params.toString()}`;
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
  if (lower.length <= 3) return tr('{0} and {1}', [lower.slice(0, -1).join(', '), lower[lower.length - 1]]);
  return tr('{0} and {1} more', [lower.slice(0, 3).join(', '), lower.length - 3]);
}

/**
 * Foods where halal really matters: they can contain pork, gelatin, animal
 * rennet, alcohol or non-halal meat. Their Amazon search asks for halal
 * products, and families are reminded to check the label. Plain staples
 * (rice, pasta, flour, lentils, spices…) are halal by nature and searched as is.
 */
const HALAL_SENSITIVE =
  /\b(sauce|sauces|ketchup|mayo|mayonnaise|dressing|teriyaki|worcestershire|bbq|barbecue|gravy|marinade|pesto|stock|broth|bouillon|gelatin|gelatine|gummy|gummies|marshmallow|marshmallows|jelly|jello|candy|candies|sweets|chocolate|cookies|biscuits|cake|pudding|custard|yogurt|yoghurt|cheese|parmesan|cream cheese|sausage|sausages|salami|pepperoni|jerky|hot dog|hotdogs|bacon|deli|luncheon|corned|canned chicken|canned beef|meatballs|vanilla extract|extract|flavouring|flavoring|wine vinegar|mirin|cooking wine|soy sauce|fish sauce|oyster sauce|noodles cup|instant noodles|ramen|soup)\b/i;

export function needsHalalCheck(name: string): boolean {
  return HALAL_SENSITIVE.test(name);
}

/** Amazon search for a grocery item in the family's store, asking for halal products where it matters. */
export function amazonFoodUrl(name: string, currency?: string | null, timeZone: string | null | undefined = deviceTimeZone()): string {
  const clean = name.trim();
  return amazonSearchUrl(needsHalalCheck(clean) && !/\bhalal\b/i.test(clean) ? `halal ${clean}` : clean, null, currency, timeZone);
}

/**
 * Amazon country stores, worldwide. Firdam earns commission only where it has
 * an Associates tag; add a store's tag here once Firdam joins that country's program.
 */
const AMAZON_STORES: Record<string, string> = {
  CAD: 'www.amazon.ca', USD: 'www.amazon.com', GBP: 'www.amazon.co.uk', EUR: 'www.amazon.fr', AED: 'www.amazon.ae',
  SAR: 'www.amazon.sa', EGP: 'www.amazon.eg', AUD: 'www.amazon.com.au', INR: 'www.amazon.in', TRY: 'www.amazon.com.tr',
  SGD: 'www.amazon.sg', JPY: 'www.amazon.co.jp', MXN: 'www.amazon.com.mx', BRL: 'www.amazon.com.br', SEK: 'www.amazon.se', PLN: 'www.amazon.pl',
  // North Africa: Amazon.fr ships there and is in French.
  MAD: 'www.amazon.fr', DZD: 'www.amazon.fr', TND: 'www.amazon.fr',
};
export const AMAZON_TAGS: Record<string, string> = { 'www.amazon.ca': AMAZON_CA_TAG };

/** Euro countries each have their own store; the time zone tells which. */
const EURO_STORES: Record<string, string> = {
  'Europe/Berlin': 'www.amazon.de', 'Europe/Vienna': 'www.amazon.de', 'Europe/Madrid': 'www.amazon.es', 'Europe/Rome': 'www.amazon.it',
  'Europe/Amsterdam': 'www.amazon.nl', 'Europe/Brussels': 'www.amazon.com.be', 'Europe/Dublin': 'www.amazon.co.uk',
};

/** When the family hasn't chosen a currency, the device's time zone suggests a store. */
const TIME_ZONE_STORES: Record<string, string> = {
  ...EURO_STORES,
  'Europe/Paris': 'www.amazon.fr', 'Europe/London': 'www.amazon.co.uk', 'Europe/Istanbul': 'www.amazon.com.tr', 'Europe/Stockholm': 'www.amazon.se',
  'Europe/Warsaw': 'www.amazon.pl', 'Asia/Dubai': 'www.amazon.ae', 'Asia/Riyadh': 'www.amazon.sa', 'Africa/Cairo': 'www.amazon.eg',
  'Asia/Kolkata': 'www.amazon.in', 'Asia/Singapore': 'www.amazon.sg', 'Asia/Tokyo': 'www.amazon.co.jp', 'America/Mexico_City': 'www.amazon.com.mx',
  'America/Sao_Paulo': 'www.amazon.com.br', 'Africa/Casablanca': 'www.amazon.fr', 'Africa/Algiers': 'www.amazon.fr', 'Africa/Tunis': 'www.amazon.fr',
};

/** The Amazon store for this family: their currency first, then their time zone, otherwise Amazon.com. */
export function amazonStoreFor(currency: string | null | undefined, timeZone: string | null | undefined = deviceTimeZone()): string {
  if (currency === 'EUR') return (timeZone && EURO_STORES[timeZone]) || AMAZON_STORES.EUR;
  if (currency && AMAZON_STORES[currency]) return AMAZON_STORES[currency];
  if (isCanadianTimeZone(timeZone)) return AMAZON_STORES.CAD;
  if (timeZone && TIME_ZONE_STORES[timeZone]) return TIME_ZONE_STORES[timeZone];
  if (timeZone?.startsWith('Australia/')) return AMAZON_STORES.AUD;
  return AMAZON_STORES.USD;
}

/** True when this family's Amazon links carry Firdam's tag (then the affiliate note must be shown). */
export function amazonIsAffiliate(currency: string | null | undefined, timeZone: string | null | undefined = deviceTimeZone()): boolean {
  return !!AMAZON_TAGS[amazonStoreFor(currency, timeZone)];
}

/** "Amazon.ca", "Amazon.co.uk"… for the family's store. */
export function amazonStoreName(currency: string | null | undefined, timeZone: string | null | undefined = deviceTimeZone()): string {
  const host = amazonStoreFor(currency, timeZone).replace(/^www\.amazon/, 'Amazon');
  return host;
}

/** Amazon search in the family's own store; carries Firdam's tag where it has one. */
export function amazonToolUrl(query: string, currency: string | null | undefined, timeZone: string | null | undefined = deviceTimeZone()): { url: string; affiliate: boolean } {
  const host = amazonStoreFor(currency, timeZone);
  const params = new URLSearchParams({ k: query.trim() });
  const tag = AMAZON_TAGS[host];
  if (tag) params.set('tag', tag);
  return { url: `https://${host}/s?${params.toString()}`, affiliate: !!tag };
}
