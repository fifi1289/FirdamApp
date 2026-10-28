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
  image_url: string | null;
  photos: string[];
  topics: string[];
  discount_code: string | null;
  discount_text: string | null;
  position: number;
}

/** Columns families see (never the admin-only fields). */
export const PARTNER_COLUMNS =
  'id, name, department, description, city, ships, how_to_order, url, image_url, photos, topics, discount_code, discount_text, position';

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

export const LEARNING_NOTE = 'Learning partners are independent teachers and schools. Classes, fees and schedules are arranged directly with them.';

export const PARTNER_NOTE = 'Partner shops are independent businesses. Orders, payment and delivery are between you and the shop.';
