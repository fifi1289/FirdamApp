/**
 * Firdam's weekend library: cities, their real prices and the places we checked
 * by hand. Every price has its source and the day it was checked; anything not
 * listed here is shown as "check the price", never guessed.
 * Shared by the website and the app (mobile/scripts/sync-shared.mjs).
 */

export interface Source {
  name: string;
  url: string;
  /** YYYY-MM-DD */
  checked: string;
}

export interface Names {
  en: string;
  fr: string;
  ar: string;
}

export interface Transit {
  /** e.g. OC Transpo */
  name: string;
  planner: string;
  /** One ride, adult. */
  adult: number;
  /** Children younger than this ride free. */
  freeUnder: number;
  /** Reduced fares by age, e.g. pre-teens. */
  reduced?: { from: number; to: number; fare: number }[];
  source: Source;
}

export interface City {
  id: string;
  name: Names;
  country: string;
  lat: number;
  lng: number;
  currency: string;
  /** Sales tax added to listed prices, as a sentence key (English). */
  taxNote?: string;
  transit?: Transit;
  /** Average hotel room per night. */
  hotel?: { average: number; source: Source };
  /** A simple halal meal for one person, eaten out. */
  meal?: { price: number; what: string; source: Source };
}

export interface Ticket {
  adult: number;
  /** Age bands with their own price; ages outside every band (and over the last) pay adult. */
  bands?: { from: number; to: number; price: number }[];
  /** Children younger than this go in free. */
  freeUnder: number;
  /** One price for a family group, used when it is cheaper. */
  family?: { price: number; maxAdults: number; maxPeople: number };
  /** A free hour or evening. */
  freeTimes?: string;
  source: Source;
}

/** A place we checked by hand, matched to the map by name and position. */
export interface KnownPlace {
  id: string;
  city: string;
  /** Lower-case words that must appear in the map name. */
  match: string[];
  lat: number;
  lng: number;
  ticket?: Ticket;
  /** Days it is closed, as sentence keys. */
  closedNote?: string;
  /** Not open at the moment: never put in a program. */
  closed?: boolean;
  /** Sentence keys with practical tips. */
  tips?: string[];
  minutes: number;
}

export interface Route {
  from: string;
  to: string;
  mode: 'train' | 'bus';
  minutes: number;
  /** Cheapest one-way adult fare seen, "from". */
  fromPrice: number;
  note?: string;
  source: Source;
}

export interface Camp {
  id: string;
  city: string;
  name: Names;
  lat: number;
  lng: number;
  /** Months it is open, 1–12. */
  months: number[];
  site: { price: number; what: string }[];
  reservationFee?: number;
  carFree: boolean;
  /** Sentence keys. */
  notes: string[];
  source: Source;
}

const CHECKED = '2026-11-15';

export const CITIES: City[] = [
  {
    id: 'ottawa',
    name: { en: 'Ottawa', fr: 'Ottawa', ar: 'أوتاوا' },
    country: 'CA',
    lat: 45.4215,
    lng: -75.6972,
    currency: 'CAD',
    taxNote: 'Prices are before tax (13% in Ontario).',
    transit: {
      name: 'OC Transpo',
      planner: 'https://www.octranspo.com/en/',
      adult: 4.1,
      freeUnder: 11,
      reduced: [{ from: 11, to: 12, fare: 2.05 }],
      source: { name: 'OC Transpo, fares from January 1, 2026', url: 'https://www.octranspo.com/en/news/article/fare-change-takes-effect-january-1-2026/', checked: CHECKED },
    },
    hotel: {
      average: 212,
      source: { name: 'CBRE forecast for 2026, in the Ottawa Business Journal', url: 'https://obj.ca/ottawa-hotel-occupancy-room-rates-expected-flat-2026-cbre', checked: CHECKED },
    },
    meal: {
      price: 11.5,
      what: 'a chicken shawarma sandwich (certified halal chicken)',
      source: { name: 'Shawarma Palace menu', url: 'https://shawarmapalace.ca/menu-chicken-shawarma/', checked: CHECKED },
    },
  },
  {
    id: 'montreal',
    name: { en: 'Montreal', fr: 'Montréal', ar: 'مونتريال' },
    country: 'CA',
    lat: 45.5019,
    lng: -73.5674,
    currency: 'CAD',
    taxNote: 'Prices are before tax (about 15% in Quebec).',
  },
  {
    id: 'gatineau',
    name: { en: 'Gatineau', fr: 'Gatineau', ar: 'غاتينو' },
    country: 'CA',
    lat: 45.4765,
    lng: -75.7013,
    currency: 'CAD',
    taxNote: 'Prices are before tax (about 15% in Quebec).',
  },
];

export const KNOWN_PLACES: KnownPlace[] = [
  {
    id: 'ottawa-science-tech',
    city: 'ottawa',
    match: ['science', 'technology'],
    lat: 45.4033,
    lng: -75.6188,
    minutes: 180,
    ticket: {
      adult: 17,
      bands: [{ from: 3, to: 17, price: 11 }],
      freeUnder: 3,
      family: { price: 43, maxAdults: 2, maxPeople: 6 },
      freeTimes: 'Free every day from 4 to 5 pm.',
      source: { name: 'Ingenium, Canada Science and Technology Museum', url: 'https://ingeniumcanada.org/cstm/visit', checked: CHECKED },
    },
    closedNote: 'Closed on Mondays from mid-September to April.',
    tips: ['Open 9 am to 5 pm.'],
  },
  {
    id: 'ottawa-agriculture-food',
    city: 'ottawa',
    match: ['agriculture'],
    lat: 45.3866,
    lng: -75.7064,
    minutes: 150,
    ticket: {
      adult: 14.5,
      bands: [{ from: 3, to: 17, price: 12.25 }],
      freeUnder: 3,
      family: { price: 40.5, maxAdults: 2, maxPeople: 6 },
      freeTimes: 'Free every day from 4 to 5 pm.',
      source: { name: 'Ingenium, Canada Agriculture and Food Museum', url: 'https://ingeniumcanada.org/cafm/visit', checked: CHECKED },
    },
    closedNote: 'From November to February it opens Wednesday to Sunday only.',
    tips: ['Open 9 am to 5 pm.', 'Farm animals: children love the barns.'],
  },
  {
    id: 'ottawa-nature',
    city: 'ottawa',
    match: ['museum', 'nature'],
    lat: 45.4127,
    lng: -75.6886,
    minutes: 150,
    ticket: {
      adult: 26,
      bands: [{ from: 3, to: 12, price: 19 }, { from: 13, to: 17, price: 19 }],
      freeUnder: 3,
      freeTimes: 'Free on Thursdays from 5 to 8 pm, with a free ticket booked ahead.',
      source: { name: '613today, checked against nature.ca on October 22, 2026', url: 'https://613today.ca/places/canadian-museum-of-nature', checked: CHECKED },
    },
    closedNote: 'Closed on Tuesdays until May 2027.',
    tips: ['Weekends: 9:30 am to 4 pm until May 2027.', 'Booking online saves 10%.'],
  },
  {
    id: 'gatineau-history',
    city: 'gatineau',
    match: ['history'],
    lat: 45.4301,
    lng: -75.7092,
    minutes: 180,
    ticket: {
      adult: 25,
      bands: [{ from: 3, to: 12, price: 18 }, { from: 13, to: 17, price: 20 }],
      freeUnder: 3,
      family: { price: 68, maxAdults: 2, maxPeople: 6 },
      freeTimes: 'Free on Thursdays from 5 to 7 pm.',
      source: { name: 'Canadian Museum of History', url: 'https://historymuseum.ca/visit', checked: CHECKED },
    },
    tips: ['Open every day 9 am to 5 pm until March 2027.', 'Everyone needs a timed ticket, even babies.', 'The Children’s Museum is inside.'],
  },
  {
    id: 'ottawa-war-museum',
    city: 'ottawa',
    match: ['war', 'museum'],
    lat: 45.4171,
    lng: -75.7168,
    minutes: 150,
    ticket: {
      adult: 23,
      bands: [{ from: 3, to: 12, price: 16 }, { from: 13, to: 17, price: 18 }],
      freeUnder: 3,
      family: { price: 62, maxAdults: 2, maxPeople: 6 },
      freeTimes: 'Free on Thursdays from 5 to 7 pm.',
      source: { name: 'Canadian War Museum', url: 'https://www.warmuseum.ca/visit/admission-fees/', checked: CHECKED },
    },
    tips: ['Open 9 am to 5 pm.', 'Everyone needs a timed ticket.'],
  },
  {
    id: 'ottawa-national-gallery',
    city: 'ottawa',
    match: ['national gallery'],
    lat: 45.4295,
    lng: -75.6989,
    minutes: 120,
    ticket: {
      adult: 22,
      bands: [{ from: 12, to: 17, price: 12 }, { from: 18, to: 30, price: 15 }],
      freeUnder: 12,
      freeTimes: 'Free on Thursdays from 5 to 8 pm, with a free ticket.',
      source: { name: '613today, checked October 23, 2026', url: 'https://613today.ca/places/national-gallery-of-canada', checked: CHECKED },
    },
    tips: ['Buying online is $3 cheaper.'],
  },
  {
    id: 'ottawa-aviation',
    city: 'ottawa',
    match: ['aviation'],
    lat: 45.4588,
    lng: -75.6441,
    minutes: 150,
    closed: true,
  },
];

export const ROUTES: Route[] = [
  {
    from: 'ottawa',
    to: 'montreal',
    mode: 'train',
    minutes: 120,
    fromPrice: 42,
    note: 'VIA Rail. Prices change with the date: book early for the lowest fares.',
    source: { name: 'Narcity, May 23, 2026', url: 'https://www.narcity.com/ottawa/train-ride-from-ottawa-takes-you-to-paris-of-north-america/via-rail-ottawa-to-montreal', checked: CHECKED },
  },
];

export const CAMPS: Camp[] = [
  {
    id: 'gatineau-park-philippe',
    city: 'ottawa',
    name: { en: 'Gatineau Park campgrounds (Philippe Lake)', fr: 'Campings du parc de la Gatineau (lac Philippe)', ar: 'مخيمات حديقة غاتينو (بحيرة فيليب)' },
    lat: 45.6109,
    lng: -76.0003,
    months: [6, 7, 8, 9, 10],
    site: [
      { price: 45, what: 'Tent site, no services' },
      { price: 56, what: 'Tent site with water and electricity' },
      { price: 128, what: 'Four-season tent, ready to camp (low season, weekend)' },
    ],
    reservationFee: 11.5,
    carFree: false,
    notes: [
      'The 2026 season ran from June 12 to October 12; 2027 dates are not published yet.',
      'There is no bus to the campground outside the summer shuttle: plan a car.',
    ],
    source: { name: 'NCC, summer camping fees 2026', url: 'https://ncc-ccn.gc.ca/places/summer-camping-rates-and-fees', checked: CHECKED },
  },
];

const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
export const kmBetween = near;

/** The library city a point belongs to (within 40 km of its centre). */
export function cityNear(p: { lat: number; lng: number }): City | null {
  let best: { c: City; d: number } | null = null;
  for (const c of CITIES) {
    const d = near(p, c);
    if (d <= 40 && (!best || d < best.d)) best = { c, d };
  }
  return best?.c ?? null;
}

/** The place we checked by hand that this map place is, if any. */
export function knownPlace(p: { name: string; lat: number; lng: number }): KnownPlace | null {
  const name = p.name.toLowerCase();
  return KNOWN_PLACES.find((k) => near(p, k) < 0.8 && k.match.every((w) => name.includes(w))) ?? null;
}

/** What a group pays at a place with this ticket: the family price when it is cheaper. */
export function ticketCost(t: Ticket, adults: number, kids: number[]): number {
  const one = (age: number) => (age < t.freeUnder ? 0 : t.bands?.find((b) => age >= b.from && age <= b.to)?.price ?? t.adult);
  const each = adults * t.adult + kids.reduce((s, a) => s + one(a), 0);
  const people = adults + kids.filter((a) => a >= t.freeUnder).length;
  if (t.family && adults <= t.family.maxAdults && people <= t.family.maxPeople) return Math.min(each, t.family.price);
  return each;
}

/** One-way transit fare for the group. */
export function transitFare(tr: Transit, adults: number, kids: number[]): number {
  return adults * tr.adult + kids.reduce((s, a) => s + (a < tr.freeUnder ? 0 : tr.reduced?.find((r) => a >= r.from && a <= r.to)?.fare ?? tr.adult), 0);
}
