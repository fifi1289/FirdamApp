// GENERATED from features/groceries/shopping-departments.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * Shopping is organised by department. Groceries (food for the family's meals)
 * is live; the others arrive with partner stores. Shared by the website and the
 * phone app (the app gets a copy via mobile/scripts/sync-shared.mjs).
 */
export const SHOPPING_DEPARTMENTS: { id: string; label: string; note: string; live: boolean }[] = [
  { id: 'groceries', label: 'Groceries', note: 'Food and kitchen basics for your meals', live: true },
  { id: 'household', label: 'Household', note: 'Cleaning, toiletries and home essentials', live: false },
  { id: 'clothing', label: 'Clothing', note: 'Modest wear for the whole family', live: false },
  { id: 'kids', label: 'Kids & school', note: 'School supplies, toys and books', live: false },
  { id: 'gifts', label: 'Eid & gifts', note: 'Gifts and decorations for the occasions', live: false },
];

export const UPCOMING_DEPARTMENTS = SHOPPING_DEPARTMENTS.filter((d) => !d.live);
