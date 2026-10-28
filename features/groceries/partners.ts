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
  discount_code: string | null;
  discount_text: string | null;
  position: number;
}

/** Columns families see (never the admin-only fields). */
export const PARTNER_COLUMNS =
  'id, name, department, description, city, ships, how_to_order, url, image_url, photos, discount_code, discount_text, position';

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
  return 'Visit shop';
}

export const PARTNER_NOTE = 'Partner shops are independent businesses. Orders, payment and delivery are between you and the shop.';
