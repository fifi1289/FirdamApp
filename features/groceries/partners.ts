/**
 * Partner shops: Muslim-owned businesses listed in Shopping, by department.
 * Shared by the website and the app (mobile/scripts/sync-shared.mjs).
 */

export interface PartnerShop {
  id: string;
  name: string;
  department: string;
  description: string | null;
  city: string | null;
  ships: string | null;
  how_to_order: string | null;
  url: string;
  phone?: string | null;
  image_url: string | null;
  photos: string[];
  topics: string[];
  discount_code: string | null;
  discount_text: string | null;
  position: number;
  /** ISO code of where the business is based ('CA'). */
  country?: string | null;
  /** 'country' = home country only · 'countries' = + ship_countries · 'worldwide' = all but exclude_countries. */
  ships_mode?: ShipsMode | null;
  ship_countries?: string[] | null;
  exclude_countries?: string[] | null;
  /** Services & learning: 'online', 'in_person' or 'both'. */
  works?: WorksMode | null;
}

export type ShipsMode = 'country' | 'countries' | 'worldwide';
export type WorksMode = 'online' | 'in_person' | 'both';

/** Columns families see (never the admin-only fields). */
export const PARTNER_COLUMNS =
  'id, name, department, description, city, ships, how_to_order, url, phone, image_url, photos, topics, discount_code, discount_text, position, country, ships_mode, ship_countries, exclude_countries, works';

const WHERE_COLUMNS = ', country, ships_mode, ship_countries, exclude_countries, works';

/** Partners for one department, in the order the admin set. */
export function partnersIn(shops: PartnerShop[], department: string): PartnerShop[] {
  return shops.filter((s) => s.department === department).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

/** Departments that have at least one partner shop. */
export function partnerDepartments(shops: PartnerShop[]): Set<string> {
  return new Set(shops.map((s) => s.department));
}

/** Short line under the shop name: "Hamilton, ON · Ships across Canada". */
export function partnerMeta(shop: Pick<PartnerShop, 'city' | 'ships'>): string {
  return [shop.city, shop.ships].filter(Boolean).join(' · ');
}

/** Where the link goes, for the button label. */
export function partnerLinkLabel(url: string): string {
  if (/facebook\.com|fb\.com/i.test(url)) return 'Visit on Facebook';
  if (/instagram\.com/i.test(url)) return 'Visit on Instagram';
  if (/wa\.me|whatsapp\.com/i.test(url)) return 'Message on WhatsApp';
  return 'Visit website';
}

/** Every kind of partner: the Shopping departments plus Learning. */
export const PARTNER_CATEGORIES: { id: string; label: string }[] = [
  { id: 'groceries', label: 'Groceries' },
  { id: 'household', label: 'Household' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'kids', label: 'Kids & school' },
  { id: 'gifts', label: 'Eid & gifts' },
  { id: 'learning', label: 'Learning (Quran, Arabic, classes)' },
  { id: 'services', label: 'Services (home, professional, business, events, travel)' },
];

/** What learning partners can teach; used as filters in Learning. */
export const LEARNING_TOPICS = ['Quran', 'Tajweed', 'Hifz', 'Arabic', 'Hadith', 'Islamic studies', 'Kids', 'Sisters'] as const;

/** Learning partners, optionally only those teaching one topic. */
export function learningPartners(shops: PartnerShop[], topic?: string | null): PartnerShop[] {
  return partnersIn(shops, 'learning').filter((s) => !topic || s.topics.includes(topic));
}

/** Topics that at least one learning partner teaches, in the standard order. */
export function learningTopicsInUse(shops: PartnerShop[]): string[] {
  const used = new Set(partnersIn(shops, 'learning').flatMap((s) => s.topics));
  return LEARNING_TOPICS.filter((t) => used.has(t));
}

/** Kinds of local services, grouped for the filters in Services. */
export const SERVICE_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: 'home', label: 'Home', types: ['Renovation', 'Cleaning', 'Moving', 'Plumbing & electrical', 'Property management'] },
  { id: 'professional', label: 'Professional', types: ['Accounting & tax', 'Legal & wills', 'Real estate', 'Islamic finance'] },
  { id: 'business', label: 'Business & digital', types: ['Website creation', 'Marketing & social media', 'Graphic design', 'Business & project management'] },
  { id: 'events', label: 'Events', types: ['Catering', 'Henna', 'Photography', 'Event planning'] },
  { id: 'travel', label: 'Travel', types: ['Hajj & Umrah', 'Travel agency'] },
];
export const SERVICE_TYPES = SERVICE_GROUPS.flatMap((g) => g.types);

/** Service partners, optionally only one group (Home, Professional…) and one kind of service. */
export function servicePartners(shops: PartnerShop[], group?: string | null, type?: string | null): PartnerShop[] {
  const types = type ? [type] : group ? SERVICE_GROUPS.find((g) => g.id === group)?.types ?? [] : null;
  return partnersIn(shops, 'services').filter((s) => !types || s.topics.some((t) => types.includes(t)));
}

/** How many partners offer each kind of service. */
export function serviceTypeCounts(shops: PartnerShop[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of partnersIn(shops, 'services')) for (const t of s.topics) out[t] = (out[t] ?? 0) + 1;
  return out;
}

/** Groups that at least one service partner belongs to, in the standard order. */
export function serviceGroupsInUse(shops: PartnerShop[]): { id: string; label: string }[] {
  const used = new Set(partnersIn(shops, 'services').flatMap((s) => s.topics));
  return SERVICE_GROUPS.filter((g) => g.types.some((t) => used.has(t))).map(({ id, label }) => ({ id, label }));
}

/** What a partner can be tagged with, by category. */
export function topicsFor(department: string): readonly string[] {
  if (department === 'learning') return LEARNING_TOPICS;
  if (department === 'services') return SERVICE_TYPES;
  return [];
}

/** Columns to ask for, newest first: older databases may not have every column yet. */
export const PARTNER_COLUMN_FALLBACKS = [
  PARTNER_COLUMNS,
  PARTNER_COLUMNS.replace(WHERE_COLUMNS, ''),
  PARTNER_COLUMNS.replace(WHERE_COLUMNS, '').replace(', phone', ''),
  PARTNER_COLUMNS.replace(WHERE_COLUMNS, '').replace(', phone', '').replace(', topics', ''),
];

/** Phone as a tel: link ("613-262-8640" → "tel:+16132628640" for 10-digit North American numbers). */
export function telLink(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${/^\d{10}$/.test(digits) ? `+1${digits}` : digits}`;
}

export const SERVICES_NOTE = 'Service partners are independent businesses. Quotes, prices and work are agreed directly with them.';

export const LEARNING_NOTE = 'Learning partners are independent teachers and schools. Classes, fees and schedules are arranged directly with them.';

export const PARTNER_NOTE = 'Partner shops are independent businesses. Orders, payment and delivery are between you and the shop.';

/* ---------- Countries: who can each partner reach? ---------- */

/** Countries partners can be in or deliver to (ISO code → name), by name. */
export const COUNTRIES: { code: string; name: string }[] = [
  ['AF', 'Afghanistan'], ['AL', 'Albania'], ['DZ', 'Algeria'], ['AR', 'Argentina'], ['AU', 'Australia'], ['AT', 'Austria'],
  ['AZ', 'Azerbaijan'], ['BH', 'Bahrain'], ['BD', 'Bangladesh'], ['BE', 'Belgium'], ['BA', 'Bosnia and Herzegovina'], ['BR', 'Brazil'],
  ['BN', 'Brunei'], ['BG', 'Bulgaria'], ['CM', 'Cameroon'], ['CA', 'Canada'], ['TD', 'Chad'], ['CN', 'China'], ['HR', 'Croatia'],
  ['CY', 'Cyprus'], ['CZ', 'Czechia'], ['DK', 'Denmark'], ['DJ', 'Djibouti'], ['EG', 'Egypt'], ['ER', 'Eritrea'], ['ET', 'Ethiopia'],
  ['FI', 'Finland'], ['FR', 'France'], ['GM', 'Gambia'], ['DE', 'Germany'], ['GH', 'Ghana'], ['GR', 'Greece'], ['GN', 'Guinea'],
  ['HK', 'Hong Kong'], ['HU', 'Hungary'], ['IN', 'India'], ['ID', 'Indonesia'], ['IR', 'Iran'], ['IQ', 'Iraq'], ['IE', 'Ireland'],
  ['IT', 'Italy'], ['CI', 'Ivory Coast'], ['JP', 'Japan'], ['JO', 'Jordan'], ['KZ', 'Kazakhstan'], ['KE', 'Kenya'], ['XK', 'Kosovo'],
  ['KW', 'Kuwait'], ['KG', 'Kyrgyzstan'], ['LB', 'Lebanon'], ['LY', 'Libya'], ['LU', 'Luxembourg'], ['MY', 'Malaysia'],
  ['MV', 'Maldives'], ['ML', 'Mali'], ['MR', 'Mauritania'], ['MU', 'Mauritius'], ['MX', 'Mexico'], ['MA', 'Morocco'],
  ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['MK', 'North Macedonia'], ['NO', 'Norway'],
  ['OM', 'Oman'], ['PK', 'Pakistan'], ['PS', 'Palestine'], ['PH', 'Philippines'], ['PL', 'Poland'], ['PT', 'Portugal'], ['QA', 'Qatar'],
  ['RO', 'Romania'], ['RU', 'Russia'], ['SA', 'Saudi Arabia'], ['SN', 'Senegal'], ['SG', 'Singapore'], ['SO', 'Somalia'],
  ['ZA', 'South Africa'], ['KR', 'South Korea'], ['ES', 'Spain'], ['LK', 'Sri Lanka'], ['SD', 'Sudan'], ['SE', 'Sweden'],
  ['CH', 'Switzerland'], ['SY', 'Syria'], ['TJ', 'Tajikistan'], ['TZ', 'Tanzania'], ['TH', 'Thailand'], ['TN', 'Tunisia'],
  ['TR', 'Türkiye'], ['TM', 'Turkmenistan'], ['UG', 'Uganda'], ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'],
  ['GB', 'United Kingdom'], ['US', 'United States'], ['UZ', 'Uzbekistan'], ['YE', 'Yemen'],
].map(([code, name]) => ({ code, name }));

const COUNTRY_NAMES = new Map(COUNTRIES.map((c) => [c.code, c.name]));

/** "CA" → "Canada" (the code itself if it isn't in the list). */
export function countryName(code: string | null | undefined): string {
  return (code && COUNTRY_NAMES.get(code)) || code || '';
}

/** A two-letter code we know, upper-cased; null otherwise (Cloudflare uses XX/T1 for unknown/Tor). */
export function normalizeCountry(code: string | null | undefined): string | null {
  const c = (code ?? '').trim().toUpperCase();
  return COUNTRY_NAMES.has(c) ? c : null;
}

/** The country in a locale like "en-CA" or "fr_MA"; null if there's none. */
export function countryFromLocale(locale: string | null | undefined): string | null {
  const m = (locale ?? '').match(/[-_]([A-Za-z]{2})(?:$|[-_@.])/);
  return m ? normalizeCountry(m[1]) : null;
}

/** Shown when families pick "All countries". */
export const ALL_COUNTRIES = 'ALL';

/** Can this partner deliver to (or serve) someone in this country? Unknown country → yes. */
export function partnerReaches(shop: PartnerShop, country: string | null): boolean {
  if (!country || country === ALL_COUNTRIES || !shop.country) return true;
  const mode = shop.ships_mode ?? 'country';
  if (mode === 'worldwide') return !(shop.exclude_countries ?? []).includes(country);
  if (country === shop.country) return true;
  return mode === 'countries' && (shop.ship_countries ?? []).includes(country);
}

/** Partners that can reach this country (all of them for "All countries"). */
export function partnersFor(shops: PartnerShop[], country: string | null): PartnerShop[] {
  return shops.filter((s) => partnerReaches(s, country));
}

/** Countries worth offering in the picker: the family's own, then every country a partner is in or delivers to. */
export function partnerCountryOptions(shops: PartnerShop[], home: string | null): string[] {
  const set = new Set<string>();
  for (const s of shops) {
    if (s.country) set.add(s.country);
    if (s.ships_mode === 'countries') for (const c of s.ship_countries ?? []) set.add(c);
  }
  if (home) set.delete(home);
  const rest = [...set].sort((a, b) => countryName(a).localeCompare(countryName(b)));
  return home ? [home, ...rest] : rest;
}

/** Joins names: "Canada", "Canada & United States", "Canada, Morocco & United States". */
function joinNames(codes: string[]): string {
  const names = codes.map(countryName);
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** Whether a partner delivers things or serves people (services and learning). */
export function isServicePartner(shop: Pick<PartnerShop, 'department'>): boolean {
  return shop.department === 'services' || shop.department === 'learning';
}

/** "Ships to Canada & United States", "Serves clients worldwide", "Ships worldwide except Australia". */
export function reachLabel(shop: PartnerShop): string {
  if (!shop.country) return '';
  const serves = isServicePartner(shop);
  const mode = shop.ships_mode ?? 'country';
  if (mode === 'worldwide') {
    const ex = shop.exclude_countries ?? [];
    return `${serves ? 'Serves clients worldwide' : 'Ships worldwide'}${ex.length ? ` except ${joinNames(ex)}` : ''}`;
  }
  const codes = mode === 'countries' ? [shop.country, ...(shop.ship_countries ?? []).filter((c) => c !== shop.country)] : [shop.country];
  if (serves) return `Serves clients in ${joinNames(codes)}`;
  return codes.length === 1 ? `Ships within ${joinNames(codes)}` : `Ships to ${joinNames(codes)}`;
}

/** Shown on a card when the family browses partners that can't reach them. */
export function notReachLabel(shop: PartnerShop, country: string): string {
  return `${isServicePartner(shop) ? 'Doesn’t serve' : 'Doesn’t ship to'} ${countryName(country)}`;
}

/** How a service or learning partner works. */
export const WORKS_OPTIONS: { id: WorksMode; label: string }[] = [
  { id: 'online', label: 'Online' },
  { id: 'in_person', label: 'In person' },
  { id: 'both', label: 'Online & in person' },
];

export function worksLabel(works: WorksMode | null | undefined): string {
  return WORKS_OPTIONS.find((w) => w.id === works)?.label ?? '';
}

/** The Online / In person filter: 'both' partners match either. */
export function matchesWorks(shop: PartnerShop, filter: 'online' | 'in_person' | null): boolean {
  if (!filter) return true;
  return shop.works === filter || shop.works === 'both';
}

/** The delivery choices in the partner form and Admin. */
export const SHIPS_OPTIONS: { id: ShipsMode; label: string; serviceLabel: string }[] = [
  { id: 'country', label: 'Only in my country', serviceLabel: 'Only clients in my country' },
  { id: 'countries', label: 'My country and some other countries', serviceLabel: 'Clients in my country and some other countries' },
  { id: 'worldwide', label: 'Worldwide (I can exclude some countries)', serviceLabel: 'Clients worldwide (I can exclude some countries)' },
];
