/**
 * Weekend programs, shared by the website and the app (the app gets a copy via
 * mobile/scripts/sync-shared.mjs). Labels are English keys for tr().
 */

export type Who = 'single' | 'couple' | 'family';
export type Style = 'simple' | 'fancy';
export type Budget = 'low' | 'normal';
export type WeekendDayKey = 'sat' | 'sun';

export interface WeekendPlace {
  key: string;
  kind: string;
  name: string;
  lat: number;
  lng: number;
  address?: string | null;
  website?: string | null;
  hours?: string | null;
  /** 'no' free entry, 'usually_free' public space, 'yes' paid, null unknown. */
  fee?: string | null;
  indoor?: boolean;
  km: number;
  /** For food: 'halal' | 'halal_only' | 'halal_options' | 'likely'. */
  halal?: string | null;
  cuisine?: string | null;
}

export interface WeekendStep {
  time: string | null;
  title: string;
  note: string;
  place: WeekendPlace | null;
}

export interface WeekendDay {
  day: WeekendDayKey;
  date: string;
  weather: { max: number; min: number; rain: number; code: number } | null;
  theme: string;
  steps: WeekendStep[];
}

export interface WeekendPlan {
  title: string;
  place: string | null;
  days: WeekendDay[];
  prepare: string[];
  money: string;
  attribution: string;
}

export interface WeekendRequest {
  lat: number;
  lng: number;
  place?: string;
  who: Who;
  kids: number[];
  style: Style;
  budget: Budget;
  days: WeekendDayKey[];
  lang: 'en' | 'fr' | 'ar';
}

/** Who usually goes out together, from the family list (kids' ages from birth dates). */
export function whoFromFamily(members: { birth_date?: string | null; relationship?: string | null }[]): { who: Who; kids: number[] } {
  const now = Date.now();
  const age = (d?: string | null) => (d ? Math.floor((now - new Date(d).getTime()) / (365.25 * 86_400_000)) : null);
  const kids = members
    .filter((m) => /son|daughter|child|kid/i.test(m.relationship ?? '') || ((age(m.birth_date) ?? 99) < 18))
    .map((m) => age(m.birth_date))
    .filter((a): a is number => a != null && a >= 0 && a < 18)
    .sort((a, b) => a - b);
  const children = members.filter((m) => /son|daughter|child|kid/i.test(m.relationship ?? '') || ((age(m.birth_date) ?? 99) < 18)).length;
  if (children > 0) return { who: 'family', kids };
  if (members.some((m) => /wife|husband|spouse|partner/i.test(m.relationship ?? ''))) return { who: 'couple', kids: [] };
  return { who: 'single', kids: [] };
}

/** "Free entry", "Usually free", "Paid entry: check the price" — or nothing when we don't know. */
export function feeLabel(fee?: string | null): string | null {
  if (fee === 'no') return 'Free entry';
  if (fee === 'usually_free') return 'Usually free';
  if (fee === 'yes') return 'Paid entry: check the price';
  return null;
}

export function halalLabel(status?: string | null): string | null {
  if (status === 'halal' || status === 'halal_only') return 'Marked halal';
  if (status === 'halal_options') return 'Has halal options';
  if (status === 'likely') return 'Often halal: ask before ordering';
  return null;
}

const KIND_LABELS: Record<string, string> = {
  park: 'Park', playground: 'Playground', nature: 'Nature reserve', garden: 'Garden', water_park: 'Water park', pool: 'Swimming pool',
  ice_rink: 'Ice rink', mini_golf: 'Mini golf', trampoline: 'Trampoline park', sports: 'Sports centre', museum: 'Museum', zoo: 'Zoo',
  aquarium: 'Aquarium', theme_park: 'Theme park', attraction: 'Attraction', viewpoint: 'Viewpoint', gallery: 'Gallery', picnic: 'Picnic spot',
  library: 'Library', planetarium: 'Planetarium', arts: 'Arts centre', community: 'Community centre', beach: 'Beach', mall: 'Shopping centre',
  food: 'Halal food', mosque: 'Mosque',
};
export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? 'Place';

/** "Sunny", "Rain"… from the forecast's weather code. */
export function skyLabel(code: number): string {
  if (code >= 95) return 'Thunderstorms';
  if (code >= 71 && code <= 86) return 'Snow';
  if (code >= 51) return 'Rain';
  if (code >= 45) return 'Fog';
  if (code >= 2) return 'Cloudy';
  return 'Sunny';
}

/** Opens directions in Google Maps (works in browsers and on phones). */
export const directionsLink = (p: WeekendPlace) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
