/**
 * The features shown in the ring on the phone app's Home, clockwise from the
 * top (the app gets a copy via mobile/scripts/sync-shared.mjs). The website
 * doesn't show the ring because its sidebar already lists every feature; the
 * web paths are kept so both stay pointed at the same places.
 */
export type HomeFeatureId = 'prayer' | 'qibla' | 'quran' | 'halal' | 'meals' | 'recipes' | 'shopping' | 'pantry' | 'finance' | 'calendar' | 'family';

export const HOME_FEATURES: { id: HomeFeatureId; label: string; web: string; app: string }[] = [
  { id: 'prayer', label: 'Prayer', web: '/dashboard/prayer-times', app: '/prayer' },
  { id: 'qibla', label: 'Qibla', web: '/dashboard/prayer-times#qibla', app: '/qibla' },
  { id: 'quran', label: 'Quran & Duas', web: '/dashboard/quran', app: '/quran' },
  { id: 'halal', label: 'Halal places', web: '/dashboard/halal-places', app: '/halal' },
  { id: 'meals', label: 'Meal plan', web: '/dashboard/meals', app: '/kitchen?section=plan' },
  { id: 'recipes', label: 'Recipes', web: '/dashboard/recipes', app: '/kitchen?section=recipes' },
  { id: 'shopping', label: 'Shopping', web: '/dashboard/shopping', app: '/kitchen?section=shopping' },
  { id: 'pantry', label: 'Pantry', web: '/dashboard/pantry', app: '/kitchen?section=pantry' },
  { id: 'finance', label: 'Finance & zakat', web: '/dashboard/finance', app: '/finance' },
  { id: 'calendar', label: 'Calendar', web: '/dashboard/calendar', app: '/calendar' },
  { id: 'family', label: 'Family', web: '/dashboard/family', app: '/family' },
];

/** Where item i of n sits on the ring, as a fraction of the radius (0 = top, clockwise). */
export function ringPoint(i: number, n: number): { x: number; y: number } {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return { x: Math.cos(a), y: Math.sin(a) };
}
