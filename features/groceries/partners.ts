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
}

/** Columns families see (never the admin-only fields). */
export const PARTNER_COLUMNS =
  'id, name, department, description, city, ships, how_to_order, url, phone, image_url, photos, topics, discount_code, discount_text, position';

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
  { id: 'services', label: 'Services (home, professional, events, travel)' },
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
  { id: 'home', label: 'Home', types: ['Renovation', 'Cleaning', 'Moving', 'Plumbing & electrical'] },
  { id: 'professional', label: 'Professional', types: ['Accounting & tax', 'Legal & wills', 'Real estate', 'Islamic finance'] },
  { id: 'events', label: 'Events', types: ['Catering', 'Henna', 'Photography', 'Event planning'] },
  { id: 'travel', label: 'Travel', types: ['Hajj & Umrah', 'Travel agency'] },
];
export const SERVICE_TYPES = SERVICE_GROUPS.flatMap((g) => g.types);

/** Service partners, optionally only one group (Home, Professional…). */
export function servicePartners(shops: PartnerShop[], group?: string | null): PartnerShop[] {
  const types = group ? SERVICE_GROUPS.find((g) => g.id === group)?.types ?? [] : null;
  return partnersIn(shops, 'services').filter((s) => !types || s.topics.some((t) => types.includes(t)));
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
  PARTNER_COLUMNS.replace(', phone', ''),
  PARTNER_COLUMNS.replace(', phone', '').replace(', topics', ''),
];

/** Phone as a tel: link ("613-262-8640" → "tel:+16132628640" for 10-digit North American numbers). */
export function telLink(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${/^\d{10}$/.test(digits) ? `+1${digits}` : digits}`;
}

export const SERVICES_NOTE = 'Service partners are independent businesses. Quotes, prices and work are agreed directly with them.';

export const LEARNING_NOTE = 'Learning partners are independent teachers and schools. Classes, fees and schedules are arranged directly with them.';

export const PARTNER_NOTE = 'Partner shops are independent businesses. Orders, payment and delivery are between you and the shop.';
