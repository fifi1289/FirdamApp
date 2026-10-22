// GENERATED from features/home/home-features.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * The features shown in the ring on the phone app's Home, clockwise from the
 * top (the app gets a copy via mobile/scripts/sync-shared.mjs). The website
 * doesn't show the ring because its sidebar already lists every feature; the
 * web paths are kept so both stay pointed at the same places.
 */
export type HomeFeatureId = 'prayer' | 'qibla' | 'quran' | 'fasting' | 'halal' | 'meals' | 'recipes' | 'shopping' | 'pantry' | 'finance' | 'calendar' | 'family';

/**
 * Two rings: faith and family close to the centre, everyday living around them.
 */
export const HOME_FEATURES: { id: HomeFeatureId; label: string; web: string; app: string; ring: 'inner' | 'outer' }[] = [
  { id: 'prayer', label: 'Prayer', web: '/dashboard/prayer-times', app: '/prayer', ring: 'inner' },
  { id: 'qibla', label: 'Qibla', web: '/dashboard/prayer-times#qibla', app: '/qibla', ring: 'inner' },
  { id: 'quran', label: 'Quran & Duas', web: '/dashboard/quran', app: '/quran', ring: 'inner' },
  { id: 'fasting', label: 'Fasting', web: '/dashboard/fasting', app: '/fasting', ring: 'inner' },
  { id: 'calendar', label: 'Calendar', web: '/dashboard/calendar', app: '/calendar', ring: 'inner' },
  { id: 'family', label: 'Family', web: '/dashboard/family', app: '/family', ring: 'inner' },
  { id: 'halal', label: 'Halal places', web: '/dashboard/halal-places', app: '/halal', ring: 'outer' },
  { id: 'meals', label: 'Meal plan', web: '/dashboard/meals', app: '/kitchen?section=plan', ring: 'outer' },
  { id: 'recipes', label: 'Recipes', web: '/dashboard/recipes', app: '/kitchen?section=recipes', ring: 'outer' },
  { id: 'shopping', label: 'Shopping', web: '/dashboard/shopping', app: '/kitchen?section=shopping', ring: 'outer' },
  { id: 'pantry', label: 'Pantry', web: '/dashboard/pantry', app: '/kitchen?section=pantry', ring: 'outer' },
  { id: 'finance', label: 'Finance & zakat', web: '/dashboard/finance', app: '/finance', ring: 'outer' },
];

/** Where item i of n sits on the ring, as a fraction of the radius (0 = top, clockwise). */
export function ringPoint(i: number, n: number): { x: number; y: number } {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return { x: Math.cos(a), y: Math.sin(a) };
}
