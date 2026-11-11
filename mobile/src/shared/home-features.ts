// GENERATED from features/home/home-features.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * Every Firdam feature, shared by the website and the phone app (the app gets a
 * copy via mobile/scripts/sync-shared.mjs). On the app's Home, the next prayer
 * sits in the middle of a ring with the family's 5 favourites around it; the
 * rest are one tap away in "All features". The website lists every feature in
 * its sidebar; the web paths keep both pointed at the same places.
 */
export type HomeFeatureId =
  | 'prayer'
  | 'qibla'
  | 'quran'
  | 'fasting'
  | 'halal'
  | 'kitchen'
  | 'meals'
  | 'recipes'
  | 'shopping'
  | 'pantry'
  | 'finance'
  | 'calendar'
  | 'family'
  | 'learning'
  | 'services'
  | 'travel';

export type HomeFeatureGroup = 'Faith' | 'Kitchen' | 'Family' | 'Everyday';

export const HOME_FEATURES: { id: HomeFeatureId; label: string; web: string; app: string; group: HomeFeatureGroup }[] = [
  { id: 'prayer', label: 'Prayer', web: '/dashboard/prayer-times', app: '/prayer', group: 'Faith' },
  { id: 'qibla', label: 'Qibla', web: '/dashboard/prayer-times#qibla', app: '/qibla', group: 'Faith' },
  { id: 'quran', label: 'Quran & Duas', web: '/dashboard/quran', app: '/quran', group: 'Faith' },
  { id: 'fasting', label: 'Fasting', web: '/dashboard/fasting', app: '/fasting', group: 'Faith' },
  { id: 'kitchen', label: 'Kitchen', web: '/dashboard/kitchen', app: '/kitchen', group: 'Kitchen' },
  { id: 'meals', label: 'Meal plan', web: '/dashboard/meals', app: '/kitchen?section=plan', group: 'Kitchen' },
  { id: 'recipes', label: 'Recipes', web: '/dashboard/recipes', app: '/kitchen?section=recipes', group: 'Kitchen' },
  { id: 'shopping', label: 'Shopping', web: '/dashboard/shopping', app: '/kitchen?section=shopping', group: 'Kitchen' },
  { id: 'pantry', label: 'Pantry', web: '/dashboard/pantry', app: '/kitchen?section=pantry', group: 'Kitchen' },
  { id: 'family', label: 'Family', web: '/dashboard/family', app: '/family', group: 'Family' },
  { id: 'calendar', label: 'Calendar', web: '/dashboard/calendar', app: '/calendar', group: 'Family' },
  { id: 'learning', label: 'Learning', web: '/dashboard/learning', app: '/learning', group: 'Family' },
  { id: 'halal', label: 'Halal places', web: '/dashboard/halal-places', app: '/halal', group: 'Everyday' },
  { id: 'finance', label: 'Finance & zakat', web: '/dashboard/finance', app: '/finance', group: 'Everyday' },
  { id: 'travel', label: 'Travel', web: '/dashboard/travel', app: '/travel', group: 'Everyday' },
  { id: 'services', label: 'Services', web: '/dashboard/services', app: '/services', group: 'Everyday' },
];

export const HOME_FEATURE_GROUPS: HomeFeatureGroup[] = ['Faith', 'Kitchen', 'Family', 'Everyday'];

/** How many favourites fit around the prayer on Home. */
export const MAX_FAVOURITES = 7;

/** Until the family chooses their own. */
export const DEFAULT_FAVOURITES: HomeFeatureId[] = ['quran', 'qibla', 'kitchen', 'halal', 'calendar', 'family'];

/** Keeps only known features, without repeats, at most MAX_FAVOURITES. Prayer is always in the middle of the ring, so it is never a favourite. */
export function cleanFavourites(ids: unknown): HomeFeatureId[] {
  if (!Array.isArray(ids)) return [...DEFAULT_FAVOURITES];
  const known = new Set(HOME_FEATURES.map((f) => f.id));
  const out: HomeFeatureId[] = [];
  for (const id of ids) {
    if (typeof id === 'string' && id !== 'prayer' && known.has(id as HomeFeatureId) && !out.includes(id as HomeFeatureId)) out.push(id as HomeFeatureId);
  }
  return out.slice(0, MAX_FAVOURITES);
}

/** Where item i of n sits on the ring, as a fraction of the radius (0 = top, clockwise). */
export function ringPoint(i: number, n: number): { x: number; y: number } {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return { x: Math.cos(a), y: Math.sin(a) };
}
