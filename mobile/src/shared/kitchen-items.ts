// GENERATED from supabase/functions/_shared/kitchen-items.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * Kitchen item helpers shared by the receipt scanner, the website and the app.
 * Keep free of imports so it can be copied into the app (mobile/scripts/sync-shared.mjs).
 */

// Things that turn up on grocery receipts but don't belong in a kitchen pantry.
const NON_FOOD =
  /\b(soap|detergent|shampoo|conditioner|toothpaste|toothbrush|deodorant|lotion|razor|tissues?|toilet paper|paper towels?|napkins?|diapers?|nappies|wipes|bleach|cleaner|dish ?wash|dishwasher|laundry|fabric softener|sponges?|garbage bags?|trash bags?|bin bags?|foil|cling ?film|plastic wrap|batteries|battery|light ?bulbs?|candles?|lighter|matches|cosmetics?|makeup|shaving|sanitary|tampons?|pads|vitamins?|medicine|tylenol|advil|pet food|cat food|dog food|cat litter|bag fee|bottle deposit|deposit|gift card|magazine|flowers?|plants?|charcoal)\b/i;

/** True for receipt lines that aren't food or drink (soap, bags, batteries…). */
export function isNonFood(name: string): boolean {
  return NON_FOOD.test(name);
}

// Typical fridge/cupboard life once bought, by pantry category (days).
const SHELF_DAYS: Record<string, number> = {
  Seafood: 2,
  Meat: 3,
  Poultry: 2,
  Dairy: 7,
  Eggs: 21,
  Vegetables: 7,
  Fruits: 6,
  Bakery: 4,
  'Frozen Foods': 90,
  Beverages: 30,
  Snacks: 60,
  'Canned Foods': 365,
  'Pasta & Rice': 365,
  Grains: 180,
  Spices: 365,
  'Oils & Condiments': 180,
};

/** A sensible "use by" date for a fresh item, or null for long-lasting staples. */
export function suggestedExpiry(category: string, from = new Date()): string | null {
  const days = SHELF_DAYS[category];
  if (!days || days > 60) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
