// GENERATED from features/weekend/weekend-core.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * Weekend programs, shared by the website and the app (the app gets a copy via
 * mobile/scripts/sync-shared.mjs). No AI: every program is put together by
 * fixed rules from real places, the family's own prayer times, the season,
 * the forecast and the prices in the weekend library. Text is English keys for
 * tr(), translated in the app's dictionaries.
 */
import { RAMADAN_STARTS } from './makeup-core';
import { ROUTES, cityNear, kmBetween, knownPlace, ticketCost, transitFare, type Camp, type City, type Source } from './weekend-library';

export type Category = 'home' | 'visit' | 'out' | 'picnic' | 'travel' | 'camping';
export type Who = 'single' | 'couple' | 'family';
export type Style = 'simple' | 'fancy';
export type Budget = 'low' | 'normal';
export type Season = 'winter' | 'spring' | 'summer' | 'fall';
export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type DayPrayers = Record<PrayerName, string>;
export type RecipeNeed = 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'picnic' | 'quick';

export const CATEGORIES: { id: Category; label: string; hint: string }[] = [
  { id: 'home', label: 'Stay at home', hint: 'A calm day at home: every prayer, cooking together and activities.' },
  { id: 'visit', label: 'Visit family or friends', hint: 'What to make and bring, when to leave and when to pray.' },
  { id: 'out', label: 'Go out', hint: 'Pick a place on the map and we plan the day around it.' },
  { id: 'picnic', label: 'Picnic', hint: 'Pick a park, and take picnic recipes from the library.' },
  { id: 'travel', label: 'Travel to another city', hint: 'One or two days, with transport, hotel and food.' },
  { id: 'camping', label: 'Camping', hint: 'A night outdoors: fees, gear and how to get there.' },
];

/** A sentence to translate: an English key and its {0} values (a value can be a sentence, or money to format). */
export type Arg = string | number | Txt | { m: number };
export interface Txt {
  k: string;
  a?: Arg[];
}
const T = (k: string, ...a: Arg[]): Txt => (a.length ? { k, a } : { k });

/** Turns a Txt into text with the app's tr() and money formatter. */
export function say(x: Txt, tr: (k: string, a?: (string | number)[]) => string, fmt: (amount: number) => string): string {
  return tr(x.k, x.a?.map((v) => (typeof v === 'object' ? ('m' in v ? fmt(v.m) : say(v, tr, fmt)) : v)));
}

export interface Spot {
  key: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  address?: string | null;
  website?: string | null;
  hours?: string | null;
  fee?: string | null;
  indoor?: boolean;
  halal?: string | null;
  cuisine?: string | null;
}

export interface Line {
  time: string | null;
  prayer?: PrayerName;
  title: Txt;
  notes: Txt[];
  place?: Spot | null;
  recipes?: RecipeNeed;
}

export interface Cost {
  label: Txt;
  /** null: we don't know it — "check the price". */
  amount: number | null;
  detail?: Txt;
  source?: Source;
}

export interface ProgramDay {
  date: string;
  lines: Line[];
  weather?: DayWeather | null;
}

export interface Program {
  category: Category;
  title: Txt;
  season: Season;
  ramadan: boolean;
  days: ProgramDay[];
  costs: Cost[];
  currency: string | null;
  /** Sum of the costs we know. */
  total: number;
  /** Some costs are unknown, so the total is "at least". */
  partial: boolean;
  prepare: Txt[];
  tips: Txt[];
  warnings: Txt[];
  sources: Source[];
}

export interface DayWeather {
  max: number;
  min: number;
  rain: number;
  code: number;
}

export interface Base {
  who: Who;
  /** Children's ages. */
  kids: number[];
  style: Style;
  budget: Budget;
  car: boolean;
  home: { lat: number; lng: number };
  /** One per day of the program: YYYY-MM-DD. */
  dates: string[];
  /** The family's own prayer times for each day, at the place they will be. */
  prayers: DayPrayers[];
  weather?: (DayWeather | null)[];
  lang: 'en' | 'fr' | 'ar';
}

export interface Nearby {
  food: Spot[];
  mosques: Spot[];
  places: Spot[];
}

// ── Time helpers ─────────────────────────────────────────────────────

export const toMin = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
export const hm = (m: number) => {
  const r = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
};
const up5 = (m: number) => Math.ceil(m / 5) * 5;
const adultsOf = (who: Who) => (who === 'single' ? 1 : 2);

// ── Season and Ramadan ───────────────────────────────────────────────

export function seasonOf(date: string, lat: number): Season {
  const m = +date.slice(5, 7);
  const north: Season = m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'fall';
  if (lat >= 0) return north;
  return ({ winter: 'summer', spring: 'fall', summer: 'winter', fall: 'spring' } as const)[north];
}
/** Places with a real cold winter (snow, short days). */
const coldWinter = (lat: number) => Math.abs(lat) >= 38;
/** Places where summer middays are too hot to be outside (the Gulf, North Africa's south…). */
const hotSummer = (lat: number) => Math.abs(lat) < 33;

export function inRamadan(date: string): boolean {
  const t = Date.parse(`${date}T12:00:00Z`);
  return Object.values(RAMADAN_STARTS).some((s) => {
    const start = Date.parse(`${s}T00:00:00Z`);
    return t >= start && t < start + 30 * 86_400_000;
  });
}

/** Why a choice doesn't suit this weekend, or null when it does. */
export function categoryNote(cat: Category, date: string, lat: number, w?: DayWeather | null): Txt | null {
  const season = seasonOf(date, lat);
  if (cat === 'picnic') {
    if (season === 'winter' && coldWinter(lat)) return T('It is too cold for a picnic in this season. Try a day at home or an indoor outing.');
    if (w && (w.max < 12 || w.rain >= 60)) return T('The forecast is not good for a picnic this weekend.');
    if (season === 'summer' && hotSummer(lat) && w && w.max >= 38) return T('It will be very hot: a picnic is better early in the morning or after Asr.');
  }
  if (cat === 'camping') {
    if (season === 'winter' && coldWinter(lat)) return T('Camping season is over here. Most campgrounds open again in late spring.');
    if (w && w.min < 3) return T('Nights will be close to freezing: only for experienced campers with winter gear.');
  }
  return null;
}

// ── Prayers ──────────────────────────────────────────────────────────

const PRAYER_TITLE: Record<PrayerName, string> = { fajr: 'Fajr prayer', dhuhr: 'Dhuhr prayer', asr: 'Asr prayer', maghrib: 'Maghrib prayer', isha: 'Isha prayer' };
type Where = 'home' | 'mosque' | 'mat' | 'host' | 'camp' | 'hotel' | 'road';
const WHERE_NOTE: Record<Where, string> = {
  home: 'At home, together.',
  mosque: 'At the nearest mosque. Check its iqama time.',
  mat: 'With your prayer mat, at a clean and quiet spot.',
  host: 'Ask your hosts for a clean, quiet place to pray.',
  camp: 'At your campsite: the Qibla compass in Firdam shows the direction.',
  hotel: 'In your hotel room: the Qibla compass in Firdam shows the direction.',
  road: 'You will be on the way: pray as soon as you arrive, before its time ends.',
};

/** A block of the day: what you do from start to end, and where you are. */
interface Block {
  start: number;
  end: number;
  title: Txt;
  notes: Txt[];
  place?: Spot | null;
  recipes?: RecipeNeed;
  where: Where;
  /** A line without a time span (e.g. "Head home"). */
  point?: boolean;
  /** Where you are between the other blocks (not shown as a line). */
  hidden?: boolean;
}

/** The day's lines: the blocks, with every prayer at its time and where you will be then. */
function assemble(blocks: Block[], prayers: DayPrayers, mosques: Spot[], outside: Where = 'home'): Line[] {
  const lines: (Line & { at: number; order: number })[] = blocks.filter((b) => !b.hidden).map((b, i) => ({
    at: b.start, order: i, time: hm(b.start), title: b.title, notes: b.notes, place: b.place ?? null, recipes: b.recipes,
  }));
  (Object.keys(PRAYER_TITLE) as PrayerName[]).forEach((p) => {
    const at = toMin(prayers[p]);
    const covering = (b: Block) => !b.point && at >= b.start && at < b.end;
    const during = blocks.find((b) => !b.hidden && covering(b)) ?? blocks.find((b) => b.hidden && covering(b));
    let where: Where = during?.where ?? outside;
    let place: Spot | null = null;
    if (where === 'mat' || where === 'mosque') {
      const spot = during?.place;
      const m = spot ? nearest(mosques, spot, 3) : null;
      if (m) { where = 'mosque'; place = m; } else where = 'mat';
    }
    lines.push({ at, order: -1, time: prayers[p], prayer: p, title: T(PRAYER_TITLE[p]), notes: [T(WHERE_NOTE[where])], place });
  });
  return lines.sort((a, b) => a.at - b.at || a.order - b.order).map(({ at: _a, order: _o, ...l }) => l);
}

function nearest(list: Spot[], from: { lat: number; lng: number }, maxKm: number, ok: (s: Spot) => boolean = () => true): Spot | null {
  let best: { s: Spot; d: number } | null = null;
  for (const s of list) {
    if (!ok(s)) continue;
    const d = kmBetween(from, s);
    if (d <= maxKm && (!best || d < best.d)) best = { s, d };
  }
  return best?.s ?? null;
}

// ── What each kind of place is for ───────────────────────────────────

const KIND_MINUTES: Record<string, number> = {
  park: 120, playground: 60, nature: 150, garden: 90, water_park: 180, pool: 90, ice_rink: 75, mini_golf: 60, trampoline: 75,
  sports: 90, museum: 150, zoo: 180, aquarium: 120, theme_park: 240, attraction: 45, viewpoint: 45, gallery: 90, picnic: 120,
  library: 75, planetarium: 90, arts: 75, community: 60, beach: 180, mall: 90, camp: 0,
};
const OUTDOOR = new Set(['park', 'playground', 'nature', 'garden', 'water_park', 'zoo', 'theme_park', 'viewpoint', 'picnic', 'beach', 'mini_golf', 'attraction']);
const SUMMER_ONLY = new Set(['water_park', 'beach']);
const WINTER_GOOD = new Set(['museum', 'aquarium', 'library', 'planetarium', 'gallery', 'arts', 'mall', 'ice_rink', 'trampoline', 'pool', 'sports', 'community']);

/** Kinds that suit the season and the forecast, best first (for a second stop or a trip). */
function kindsFor(season: Season, lat: number, who: Who, w?: DayWeather | null): string[] {
  const bad = !!w && (w.code >= 51 || w.rain >= 60 || w.max < 8);
  const indoor = ['museum', 'aquarium', 'planetarium', 'gallery', 'library', 'arts', 'mall'];
  if (bad || (season === 'winter' && coldWinter(lat))) return who === 'family' ? ['museum', 'aquarium', 'planetarium', 'library', 'ice_rink', 'trampoline', 'pool', 'mall'] : indoor;
  if (season === 'summer') {
    const hot = hotSummer(lat) || (!!w && w.max >= 33);
    if (hot) return who === 'family' ? ['aquarium', 'museum', 'mall', 'water_park', 'pool', 'beach', 'library'] : ['museum', 'gallery', 'aquarium', 'mall', 'beach'];
    return who === 'family' ? ['beach', 'water_park', 'zoo', 'park', 'playground', 'museum', 'garden'] : ['garden', 'viewpoint', 'beach', 'park', 'museum', 'gallery'];
  }
  return who === 'family' ? ['zoo', 'park', 'museum', 'garden', 'playground', 'nature', 'aquarium'] : ['garden', 'nature', 'viewpoint', 'museum', 'gallery', 'park'];
}

/** A few good places of a city for a trip, or a second stop near the first. */
export function pickPlaces(places: Spot[], from: { lat: number; lng: number }, kinds: string[], count: number, maxKm: number, skip: Set<string> = new Set()): Spot[] {
  const out: Spot[] = [];
  const usedKinds = new Set<string>();
  const scored = places
    .filter((p) => !skip.has(p.key) && kinds.includes(p.kind) && !knownPlace(p)?.closed && kmBetween(from, p) <= maxKm)
    .map((p) => ({ p, s: (kinds.length - kinds.indexOf(p.kind)) * 0.8 - kmBetween(from, p) * 0.4 + (knownPlace(p) ? 1.5 : 0) + Math.random() }))
    .sort((a, b) => b.s - a.s);
  for (const { p } of scored) {
    if (usedKinds.has(p.kind)) continue;
    out.push(p);
    usedKinds.add(p.kind);
    if (out.length >= count) break;
  }
  return out;
}

const halalNote = (s?: string | null): Txt =>
  s === 'halal' || s === 'halal_only' ? T('Marked halal on the map. It is still good to ask.') : s === 'halal_options' ? T('Has halal options: ask which dishes are halal.') : T('Often halal, not confirmed: ask before you order.');

/** Halal food near a place, confirmed first. */
function foodNear(food: Spot[], at: { lat: number; lng: number }, fancy: boolean): Spot | null {
  const ok = (s: Spot) => (fancy ? s.kind === 'restaurant' || s.kind === 'food' : true);
  return nearest(food, at, 3, (s) => ok(s) && s.halal !== 'likely') ?? nearest(food, at, 3, ok);
}

function travelMinutes(km: number, car: boolean): number {
  return car ? Math.round((km / 30) * 60 + 10) : Math.round((km / 18) * 60 + 15);
}

// ── Costs ────────────────────────────────────────────────────────────

function finish(p: Omit<Program, 'total' | 'partial' | 'sources'> & { sources?: Source[] }): Program {
  const known = p.costs.filter((c) => c.amount != null);
  const sources = [...(p.sources ?? []), ...p.costs.map((c) => c.source).filter((s): s is Source => !!s)];
  return {
    ...p,
    total: Math.round(known.reduce((s, c) => s + (c.amount ?? 0), 0) * 100) / 100,
    partial: p.costs.some((c) => c.amount == null),
    sources: sources.filter((s, i) => sources.findIndex((x) => x.url === s.url) === i),
  };
}

function ticketLine(place: Spot, b: Base): Cost {
  const kp = knownPlace(place);
  if (kp?.ticket) {
    return {
      label: T('Tickets: {0}', place.name),
      amount: ticketCost(kp.ticket, adultsOf(b.who), b.kids),
      detail: kp.ticket.family ? T('Family price used when it is cheaper.') : undefined,
      source: kp.ticket.source,
    };
  }
  if (place.fee === 'no') return { label: T('Entry: {0}', place.name), amount: 0, detail: T('Free entry, according to the map.') };
  if (place.fee === 'usually_free' || ['park', 'playground', 'garden', 'nature', 'picnic', 'viewpoint', 'beach', 'library', 'mall'].includes(place.kind)) {
    return { label: T('Entry: {0}', place.name), amount: 0, detail: T('Usually free to enter.') };
  }
  return { label: T('Entry: {0}', place.name), amount: null, detail: T('We have not checked this price yet: look on their website.') };
}

function transportLine(b: Base, city: City | null, trips = 2): Cost {
  if (b.car) return { label: T('Car: fuel and parking'), amount: null, detail: T('Depends on your car and where you park.') };
  if (city?.transit) {
    const fare = transitFare(city.transit, adultsOf(b.who), b.kids);
    return {
      label: T('Bus and train ({0})', city.transit.name),
      amount: Math.round(fare * trips * 100) / 100,
      detail: T('{0} one-way rides for the group. Children under {1} ride free.', trips, city.transit.freeUnder),
      source: city.transit.source,
    };
  }
  return { label: T('Bus and train'), amount: null, detail: T('We have not checked the fares in this city yet.') };
}

function mealLine(city: City | null, people: number, meals: number, label = 'Food eaten out'): Cost {
  if (city?.meal) {
    return { label: T(label), amount: Math.round(city.meal.price * people * meals * 100) / 100, detail: T('About {0} per person per meal: {1}.', { m: city.meal.price }, T(city.meal.what)), source: city.meal.source };
  }
  return { label: T(label), amount: null, detail: T('We have not checked restaurant prices in this city yet.') };
}

// ── Before you go ────────────────────────────────────────────────────

function seasonPrepare(season: Season, lat: number, w: (DayWeather | null)[] | undefined, outdoors: boolean): Txt[] {
  const out: Txt[] = [];
  const ws = (w ?? []).filter(Boolean) as DayWeather[];
  if (season === 'winter' && coldWinter(lat)) out.push(T('Warm coats, hats, gloves and winter boots'));
  else if (ws.some((x) => x.min < 10) || season === 'fall' || season === 'spring') out.push(T('Warm layers: mornings and evenings are cool'));
  if (ws.some((x) => x.rain >= 40) || (season === 'spring' && !hotSummer(lat))) out.push(T('Umbrellas or rain jackets'));
  if (outdoors && (season === 'summer' || ws.some((x) => x.max >= 25))) out.push(T('Sunscreen, hats and plenty of water'));
  return out;
}

const seasonTips = (season: Season, lat: number, outdoors: boolean): Txt[] => {
  const out: Txt[] = [];
  if (season === 'winter' && coldWinter(lat)) out.push(T('Days are short in winter: Maghrib comes early, so the program ends early.'));
  if (season === 'summer' && hotSummer(lat) && outdoors) out.push(T('Avoid the midday heat: outdoor time is planned for the morning and after Asr.'));
  return out;
};

// ── Stay at home ─────────────────────────────────────────────────────

export function buildHome(b: Base): Program {
  const date = b.dates[0];
  const p = b.prayers[0];
  const season = seasonOf(date, b.home.lat);
  const ramadan = inRamadan(date);
  const [f, d, a, m, i] = [toMin(p.fajr), toMin(p.dhuhr), toMin(p.asr), toMin(p.maghrib), toMin(p.isha)];
  const fam = b.who === 'family';
  const blocks: Block[] = [];
  const add = (start: number, minutes: number, title: Txt, notes: Txt[] = [], recipes?: RecipeNeed) =>
    blocks.push({ start: up5(start), end: up5(start) + minutes, title, notes, recipes, where: 'home' });

  const morning = fam
    ? season === 'summer' ? T('Play outside in the garden or the nearest park') : season === 'winter' && coldWinter(b.home.lat) ? T('Build a blanket fort, or do crafts together') : T('Crafts, drawing or a simple science experiment')
    : season === 'summer' ? T('A morning walk before it gets hot') : T('Read a good book, or learn something new');
  if (ramadan) {
    add(f - 45, 30, T('Suhoor'), [T('A light meal and water before Fajr.')], 'breakfast');
    add(Math.max(f + 30, 9 * 60 + 30), 60, morning);
    add(Math.min(11 * 60, d - 50), 30, fam ? T('Quran circle: read or learn a short surah together') : T('Quran time'), [T('Use the Quran section in Firdam.')]);
    add(d + 30, 90, fam ? T('Quiet time: naps for the little ones, reading for the others') : T('Rest'));
    add(a + 20, 60, fam ? T('Make a Ramadan craft or decorate the house') : T('Call family members you have not spoken to in a while'));
    add(m - 100, 80, T('Prepare iftar together'), [T('Pick a recipe from the library below.')], 'dinner');
    add(m + 15, 60, T('Iftar'), [T('Break the fast with dates and water, then the meal.')]);
    add(i + 5, 90, T('Isha and Taraweeh'), [T('At home together, or at the mosque.')]);
  } else {
    add(9 * 60, 45, T('Breakfast together'), [], 'breakfast');
    add(10 * 60, 60, morning);
    if (d - 50 >= 11 * 60) add(Math.min(11 * 60 + 15, d - 50), 30, fam ? T('Quran circle: read or learn a short surah together') : T('Quran time'), [T('Use the Quran section in Firdam.')]);
    add(d + 20, 75, T('Cook lunch together'), [T('Pick a recipe from the library below.')], 'lunch');
    if (a - (d + 95) >= 60) add(d + 100, 60, fam ? T('Quiet time: naps for the little ones, reading for the others') : T('Rest or read'));
    add(a + 20, 60, T('Bake a dessert together'), [T('A cake or sweets from the library: children love to help.')], 'dessert');
    if (m - (a + 80) >= 45) add(a + 85, Math.min(75, m - (a + 85) - 10), fam ? T('Family game time: board games, puzzles or a quiz') : T('Call family members you have not spoken to in a while'));
    add(m + 20, 60, T('Dinner together'), [], 'dinner');
    if (i <= 22 * 60 + 30) add(i + 15, 45, fam ? T('Story time and an early night') : T('Plan the coming week'), fam ? [] : [T('Your meal plan and calendar are in Firdam.')]);
  }
  return finish({
    category: 'home',
    title: T(fam ? 'A family day at home' : b.who === 'couple' ? 'A day at home for two' : 'A calm day at home'),
    season,
    ramadan,
    days: [{ date, lines: assemble(blocks, p, [], 'home') }],
    costs: [],
    currency: cityNear(b.home)?.currency ?? null,
    prepare: [T('Check the pantry and the shopping list for the recipes'), ...(fam ? [T('Paper, colours and glue for the crafts')] : [])],
    tips: [T('No tickets and no transport today: only the ingredients you cook with.'), T('Put the phones away during meals.')],
    warnings: [],
  });
}

// ── Visit family or friends ──────────────────────────────────────────

export type VisitTime = 'lunch' | 'afternoon' | 'evening';

export function buildVisit(b: Base, when: VisitTime, minutesAway: number): Program {
  const date = b.dates[0];
  const p = b.prayers[0];
  const season = seasonOf(date, b.home.lat);
  const ramadan = inRamadan(date);
  const [d, a, m] = [toMin(p.dhuhr), toMin(p.asr), toMin(p.maghrib)];
  const city = cityNear(b.home);
  let start: number, length: number;
  if (ramadan) { start = m - 30; length = 180; when = 'evening'; }
  else if (when === 'lunch') { start = Math.max(12 * 60 + 30, d + 20); length = 210; }
  else if (when === 'afternoon') { start = a + 20; length = 150; }
  else { start = m + 30; length = 180; }
  start = up5(start);
  const leave = start - minutesAway;
  const end = start + length;
  const bring: RecipeNeed = when === 'lunch' ? 'quick' : 'dessert';
  const blocks: Block[] = [
    { start: up5(leave - 150), end: up5(leave - 150) + 90, title: T(ramadan ? 'Make something for the iftar table' : 'Make something to bring'), notes: [T('Pick a recipe from the library below.')], recipes: ramadan ? 'dessert' : bring, where: 'home' },
    { start: leave, end: start, title: T('Leave for the visit'), notes: [T('About {0} minutes on the way.', minutesAway)], where: 'road' },
    { start, end, title: T(ramadan ? 'Iftar with your hosts' : when === 'lunch' ? 'Lunch with your hosts' : when === 'afternoon' ? 'Afternoon visit' : 'Evening visit'), notes: [], where: 'host' },
    { start: end, end: end + minutesAway, title: T('Head home'), notes: [], where: 'road' },
  ];
  const tips = [
    T('Call before you go to confirm the time.'),
    T('Ask about allergies before you bring food.'),
    T('A small gift is always welcome: dates, sweets or flowers.'),
    ...(b.who === 'family' ? [T('Bring a game or a book the children can share.')] : []),
  ];
  return finish({
    category: 'visit',
    title: T('A visit to family or friends'),
    season,
    ramadan,
    days: [{ date, lines: assemble(blocks, p, [], 'home') }],
    costs: [transportLine(b, city)],
    currency: city?.currency ?? null,
    prepare: [T('The dish or dessert you made, in a container that closes well'), T('A small gift'), ...seasonPrepare(season, b.home.lat, b.weather, false)],
    tips,
    warnings: [],
  });
}

// ── Go out, or a picnic, around a place they picked ──────────────────

export function buildOuting(b: Base, place: Spot, near: Nearby, picnic: boolean): Program {
  const date = b.dates[0];
  const p = b.prayers[0];
  const w = b.weather?.[0] ?? null;
  const season = seasonOf(date, b.home.lat);
  const ramadan = inRamadan(date);
  const city = cityNear(b.home);
  const kp = knownPlace(place);
  const km = kmBetween(b.home, place);
  const go = travelMinutes(km, b.car);
  const [m] = [toMin(p.maghrib)];
  const hot = season === 'summer' && (hotSummer(b.home.lat) || (!!w && w.max >= 33));
  const arrive = up5(hot && OUTDOOR.has(place.kind) ? 9 * 60 : b.style === 'fancy' ? 10 * 60 + 30 : 10 * 60);
  const endBy = ramadan ? m - go - 20 : Math.min(m - 10, 19 * 60);
  const people = adultsOf(b.who) + b.kids.filter((k) => k >= 3).length;
  const blocks: Block[] = [];
  const warnings: Txt[] = [];
  const costs: Cost[] = [];

  if (kp?.closed) warnings.push(T('This place is closed at the moment. Pick another place on the map.'));
  if (kp?.closedNote) warnings.push(T(kp.closedNote));
  if (SUMMER_ONLY.has(place.kind) && season !== 'summer') warnings.push(T('This kind of place is usually closed or too cold outside the summer.'));
  if (OUTDOOR.has(place.kind) && w && (w.code >= 51 || w.rain >= 60)) warnings.push(T('Rain is likely: bring rain gear, or pick an indoor place.'));
  const note = categoryNote(picnic ? 'picnic' : 'out', date, b.home.lat, w);
  if (note) warnings.push(note);

  blocks.push({
    start: arrive - go, end: arrive, title: T(b.car ? 'Leave home by car' : 'Leave home by bus'),
    notes: [b.car ? T('About {0} minutes by car (estimate).', go) : city?.transit ? T('About {0} minutes by bus (estimate). Check the exact route with {1}.', go, city.transit.name) : T('About {0} minutes by bus (estimate). Check the exact route with the local transit planner.', go)],
    where: 'road',
  });
  const visitMin = Math.min(kp?.minutes ?? KIND_MINUTES[place.kind] ?? 90, endBy - arrive - 30);
  const fee = ticketLine(place, b);
  const visitNotes: Txt[] = [];
  if (kp?.ticket?.freeTimes) visitNotes.push(T(kp.ticket.freeTimes));
  for (const t of kp?.tips ?? []) visitNotes.push(T(t));
  const mainTitle = picnic ? T('Time at the park') : T('Visit: {0}', place.name);

  let cursor = arrive;
  const lunchAt = (at: number) => {
    if (ramadan) return at;
    if (picnic || (b.budget === 'low' && b.style === 'simple')) {
      blocks.push({ start: up5(at), end: up5(at) + 45, title: T(picnic ? 'Picnic lunch' : 'Lunch from home'), notes: [T(picnic ? 'The food you packed: see the picnic recipes below.' : 'Eat the lunch you packed, where eating is allowed.')], recipes: picnic ? 'picnic' : 'lunch', place: picnic ? place : null, where: OUTDOOR.has(place.kind) ? 'mat' : 'mat' });
      costs.push({ label: T('Food from home'), amount: 0, detail: T('Only the ingredients you already have.') });
      return up5(at) + 45;
    }
    const food = foodNear(near.food, place, b.style === 'fancy');
    if (!food) {
      blocks.push({ start: up5(at), end: up5(at) + 45, title: T('Lunch from home'), notes: [T('We found no halal restaurant near this place, so pack lunch from home.')], recipes: 'lunch', where: 'mat' });
      costs.push({ label: T('Food from home'), amount: 0 });
      return up5(at) + 45;
    }
    const s = up5(at + 10);
    blocks.push({ start: s, end: s + (b.style === 'fancy' ? 75 : 60), title: T(b.style === 'fancy' ? 'Lunch at a restaurant' : 'Lunch'), notes: [halalNote(food.halal), T('Check the menu prices before you go.')], place: food, where: 'mat' });
    costs.push(mealLine(city, people, 1, 'Lunch out'));
    return s + (b.style === 'fancy' ? 75 : 60);
  };

  // The main place: lunch in the middle when the visit is long, after it otherwise.
  if (visitMin >= 180 || picnic) {
    const half = Math.round(visitMin / 2);
    blocks.push({ start: cursor, end: cursor + half, title: mainTitle, notes: visitNotes, place, where: 'mat' });
    cursor = lunchAt(cursor + half);
    blocks.push({ start: cursor, end: cursor + (visitMin - half), title: picnic ? T('Games and a walk in the park') : T('More time at {0}', place.name), notes: [], place, where: 'mat' });
    cursor += visitMin - half;
  } else {
    blocks.push({ start: cursor, end: cursor + visitMin, title: mainTitle, notes: visitNotes, place, where: 'mat' });
    cursor = lunchAt(cursor + visitMin);
  }
  costs.unshift(fee);

  // A second stop nearby when there is time, suited to the season.
  if (endBy - cursor >= 75) {
    const second = pickPlaces(near.places, place, [...kindsFor(season, b.home.lat, b.who, w), 'library', 'park', 'mall'].filter((k, i, all) => k !== place.kind && all.indexOf(k) === i), 1, 3, new Set([place.key]))[0];
    if (second) {
      const s = up5(cursor + 15);
      const len = Math.min(KIND_MINUTES[second.kind] ?? 60, endBy - s);
      if (len >= 45) {
        blocks.push({ start: s, end: s + len, title: T('Visit: {0}', second.name), notes: [], place: second, where: 'mat' });
        costs.push(ticketLine(second, b));
        cursor = s + len;
      }
    }
  }
  const fancyEnd = b.style === 'fancy' && !ramadan && endBy - cursor >= 50 ? nearest(near.food, place, 3, (s) => s.kind === 'cafe') : null;
  if (fancyEnd) {
    const s = up5(cursor + 10);
    blocks.push({ start: s, end: s + 45, title: T('Tea and dessert'), notes: [halalNote(fancyEnd.halal)], place: fancyEnd, where: 'mat' });
    costs.push({ label: T('Tea and dessert'), amount: null, detail: T('Check the menu prices before you go.') });
    cursor = s + 45;
  }
  if (ramadan && b.style === 'fancy') {
    const food = foodNear(near.food, place, true);
    if (food) {
      blocks.push({ start: m - 15, end: m + 75, title: T('Iftar at a restaurant'), notes: [halalNote(food.halal), T('Book a table: restaurants are full at iftar time.')], place: food, where: 'mat' });
      costs.push(mealLine(city, people, 1, 'Iftar out'));
      cursor = m + 75;
    }
  }
  blocks.push({ start: up5(cursor + 5), end: up5(cursor + 5) + go, title: T('Head home'), notes: ramadan && !(b.style === 'fancy') ? [T('Home in time for iftar.')] : [], where: 'road' });
  costs.push(transportLine(b, city));

  const outdoors = OUTDOOR.has(place.kind);
  const prepare: Txt[] = [T('Prayer mat and a small bottle of water for wudu'), T('Water bottles for everyone')];
  if (b.who === 'family') prepare.push(T('Snacks for the children'));
  if (b.kids.some((k) => k < 4)) prepare.push(T('Stroller, nappies and wipes'));
  if (picnic) prepare.push(T('Picnic blanket, plates, napkins and a bag for rubbish'), T('A cool bag for the food'));
  if (['pool', 'water_park', 'beach'].includes(place.kind)) prepare.push(T('Modest swimwear and towels'));
  if (place.kind === 'ice_rink') prepare.push(T('Helmets for the children, warm gloves'));
  prepare.push(...seasonPrepare(season, b.home.lat, b.weather, outdoors));
  if (fee.amount == null || (fee.amount ?? 0) > 0) prepare.push(T('A card or some cash for tickets'));
  prepare.push(T('Comfortable walking shoes'), T('Charged phone'));

  return finish({
    category: picnic ? 'picnic' : 'out',
    title: picnic ? T('A picnic at {0}', place.name) : T('A day out: {0}', place.name),
    season,
    ramadan,
    days: [{ date, lines: assemble(blocks, p, near.mosques, 'home') }],
    costs,
    currency: city?.currency ?? null,
    prepare,
    tips: [...seasonTips(season, b.home.lat, outdoors), ...(city?.taxNote ? [T(city.taxNote)] : [])],
    warnings,
  });
}

// ── Travel to another city ───────────────────────────────────────────

export function buildTrip(b: Base, dest: City, near: Nearby): Program {
  const homeCity = cityNear(b.home);
  const days = b.dates.length;
  const season = seasonOf(b.dates[0], dest.lat);
  const ramadan = b.dates.some(inRamadan);
  const km = kmBetween(b.home, dest);
  const route = homeCity ? ROUTES.find((r) => (r.from === homeCity.id && r.to === dest.id) || (r.to === homeCity.id && r.from === dest.id)) : undefined;
  const ride = b.car ? Math.round((km / 85) * 60 + 15) : route?.minutes ?? Math.round((km / 70) * 60 + 30);
  const people = adultsOf(b.who) + b.kids.filter((k) => k >= 3).length;
  const used = new Set<string>();
  const costs: Cost[] = [];
  const warnings: Txt[] = [];
  const tips: Txt[] = [];
  const center = { lat: dest.lat, lng: dest.lng };

  if (!b.car && !route) warnings.push(T('We have not checked trains or buses between these cities yet: look them up before you plan.'));
  if (route?.note) tips.push(T(route.note));

  const programDays: ProgramDay[] = b.dates.map((date, di) => {
    const p = b.prayers[di];
    const w = b.weather?.[di] ?? null;
    const [m] = [toMin(p.maghrib)];
    const first = di === 0, last = di === days - 1;
    const blocks: Block[] = [];
    let cursor: number;
    if (first) {
      const leave = up5(season === 'summer' ? 7 * 60 + 30 : 8 * 60);
      blocks.push({ start: leave, end: leave + ride, title: T(b.car ? 'Drive to {0}' : route?.mode === 'train' ? 'Train to {0}' : 'Travel to {0}', dest.name[b.lang]), notes: [T('About {0} minutes on the way.', ride)], where: 'road' });
      blocks.push({ start: 0, end: leave, title: T('Head home'), notes: [], where: 'home', hidden: true });
      cursor = leave + ride + 15;
    } else {
      blocks.push({ start: 8 * 60, end: 8 * 60 + 45, title: T('Breakfast'), notes: [], where: 'hotel' });
      cursor = 9 * 60 + 15;
    }
    const returnAt = last ? Math.min(m - (ramadan ? 30 : 0), 18 * 60) - ride : Math.min(m, 19 * 60);
    // Between the visits you are in the city (or at the hotel at night).
    blocks.push({ start: cursor - 15, end: last ? returnAt : m + 120, title: T('Head home'), notes: [], place: { key: 'centre', name: '', kind: 'city', lat: dest.lat, lng: dest.lng }, where: 'mat', hidden: true });
    if (!first) blocks.push({ start: 0, end: 9 * 60, title: T('Head home'), notes: [], where: 'hotel', hidden: true });
    const picks = pickPlaces(near.places, center, kindsFor(season, dest.lat, b.who, w), first && last ? 2 : 3, 12, used);
    picks.forEach((pl, idx) => {
      if (returnAt - cursor < 60) return;
      used.add(pl.key);
      const len = Math.min(knownPlace(pl)?.minutes ?? KIND_MINUTES[pl.kind] ?? 90, returnAt - cursor - 15);
      if (len < 45) return;
      blocks.push({ start: up5(cursor), end: up5(cursor) + len, title: T('Visit: {0}', pl.name), notes: [], place: pl, where: 'mat' });
      costs.push(ticketLine(pl, b));
      cursor = up5(cursor) + len + 15;
      if (idx === 0 && !ramadan) {
        const food = foodNear(near.food, pl, b.style === 'fancy') ?? foodNear(near.food, center, b.style === 'fancy');
        const s = up5(cursor);
        blocks.push({ start: s, end: s + 60, title: T('Lunch'), notes: food ? [halalNote(food.halal)] : [T('Look for halal food on the map in Firdam.')], place: food, where: 'mat' });
        cursor = s + 75;
      }
    });
    if (last) {
      blocks.push({ start: up5(Math.max(cursor, returnAt)), end: up5(Math.max(cursor, returnAt)) + ride, title: T('Travel home'), notes: [T('About {0} minutes on the way.', ride)], where: 'road' });
    } else {
      const food = foodNear(near.food, center, b.style === 'fancy');
      blocks.push({ start: up5(cursor), end: up5(cursor) + 30, title: T('Check in at the hotel'), notes: [], where: 'hotel' });
      blocks.push({ start: ramadan ? m : m + 30, end: (ramadan ? m : m + 30) + 75, title: T(ramadan ? 'Iftar' : 'Dinner'), notes: food ? [halalNote(food.halal)] : [T('Look for halal food on the map in Firdam.')], place: food, where: 'mat' });
    }
    return { date, lines: assemble(blocks, p, near.mosques, last ? 'home' : 'hotel') };
  });

  if (b.car) costs.push({ label: T('Car: fuel, tolls and parking'), amount: null, detail: T('About {0} km each way.', Math.round(km)) });
  else if (route) {
    costs.push({
      label: T(route.mode === 'train' ? 'Train tickets, return' : 'Bus tickets, return'),
      amount: route.fromPrice * adultsOf(b.who) * 2,
      detail: T('From {0} per adult each way. Children’s fares are not included: check them when you book.', { m: route.fromPrice }),
      source: route.source,
    });
  } else costs.push({ label: T('Train or bus tickets'), amount: null });
  if (days > 1) {
    const rooms = people > 4 ? 2 : 1;
    costs.push(dest.hotel
      ? { label: T('Hotel'), amount: dest.hotel.average * rooms * (days - 1), detail: T('Average room price in this city: {0} a night. {1} room(s).', { m: dest.hotel.average }, rooms), source: dest.hotel.source }
      : { label: T('Hotel'), amount: null, detail: T('We have not checked hotel prices in this city yet.') });
  }
  costs.push(mealLine(dest, people, days * 2 - 1, 'Meals out'));
  costs.push(transportLine({ ...b, car: b.car }, dest, 4));
  if (dest.taxNote) tips.push(T(dest.taxNote));
  tips.push(...seasonTips(season, dest.lat, true));

  return finish({
    category: 'travel',
    title: T(days > 1 ? 'A weekend in {0}' : 'A day in {0}', dest.name[b.lang]),
    season,
    ramadan,
    days: programDays,
    costs,
    currency: dest.currency,
    prepare: [
      T('Prayer mat and a small bottle of water for wudu'),
      ...(days > 1 ? [T('Clothes for each day, and pyjamas'), T('Toothbrushes and toiletries')] : []),
      T('Tickets and booking confirmations on your phone'),
      T('Snacks and water for the road'),
      ...(b.who === 'family' ? [T('Games or books for the trip')] : []),
      ...seasonPrepare(season, dest.lat, b.weather, true),
      T('Phone charger'),
    ],
    tips,
    warnings,
  });
}

// ── Camping ──────────────────────────────────────────────────────────

export function buildCamping(b: Base, camp: Camp | Spot, near: Nearby): Program {
  const date = b.dates[0];
  const season = seasonOf(date, b.home.lat);
  const ramadan = b.dates.some(inRamadan);
  const curated = 'site' in camp ? camp : null;
  const at = { lat: camp.lat, lng: camp.lng };
  const name = curated ? curated.name[b.lang] : (camp as Spot).name;
  const km = kmBetween(b.home, at);
  const go = travelMinutes(km, b.car || !curated?.carFree);
  const warnings: Txt[] = [];
  const month = +date.slice(5, 7);
  if (curated && !curated.months.includes(month)) warnings.push(T('This campground is closed in this month.'));
  if (curated && !curated.carFree && !b.car) warnings.push(T('You need a car to reach this campground.'));
  const note = categoryNote('camping', date, b.home.lat, b.weather?.[0]);
  if (note) warnings.push(note);
  for (const n of curated?.notes ?? []) warnings.push(T(n));

  const nights = Math.max(1, b.dates.length - 1);
  const days: ProgramDay[] = b.dates.map((d, di) => {
    const p = b.prayers[di];
    const [dh, a, m] = [toMin(p.dhuhr), toMin(p.asr), toMin(p.maghrib)];
    const blocks: Block[] = [];
    if (di === 0) {
      blocks.push({ start: 9 * 60, end: 9 * 60 + go, title: T('Drive to {0}', name), notes: [T('About {0} minutes on the way.', go)], where: 'road' });
      const s = up5(9 * 60 + go);
      blocks.push({ start: s, end: s + 60, title: T('Set up the tent'), notes: [T('Find the qibla before you set up, so the prayer spot is ready.')], where: 'camp' });
      if (!ramadan) blocks.push({ start: Math.max(s + 60, dh - 10), end: Math.max(s + 60, dh - 10) + 45, title: T('Picnic lunch'), notes: [T('The food you packed: see the picnic recipes below.')], recipes: 'picnic', where: 'camp' });
      blocks.push({ start: a + 20, end: Math.min(a + 140, m - 30), title: season === 'summer' ? T('Swim or walk by the lake') : T('A nature walk on the trails'), notes: [T('Stay on the marked trails and keep the children close.')], where: 'camp' });
      blocks.push({ start: ramadan ? m - 60 : m - 75, end: m + (ramadan ? 30 : -15), title: T(ramadan ? 'Cook iftar at the camp' : 'Cook dinner at the camp'), notes: [T('Check the fire rules at the campground.')], recipes: 'dinner', where: 'camp' });
      blocks.push({ start: m + 60, end: m + 150, title: T('A quiet evening under the stars'), notes: [], where: 'camp' });
      blocks.push({ start: 9 * 60 + go, end: 24 * 60, title: T('Head home'), notes: [], where: 'camp', hidden: true });
    } else {
      blocks.push({ start: 8 * 60, end: 8 * 60 + 45, title: T('Breakfast at the camp'), notes: [], recipes: 'breakfast', where: 'camp' });
      blocks.push({ start: 9 * 60, end: 11 * 60, title: T('Morning walk, then pack up'), notes: [T('Leave the site clean: take all your rubbish with you.')], where: 'camp' });
      blocks.push({ start: 11 * 60 + 15, end: 11 * 60 + 15 + go, title: T('Head home'), notes: [], where: 'road' });
      blocks.push({ start: 0, end: 11 * 60 + 15, title: T('Head home'), notes: [], where: 'camp', hidden: true });
    }
    return { date: d, lines: assemble(blocks, p, near.mosques, 'home') };
  });

  const costs: Cost[] = [];
  if (curated) {
    const site = curated.site[0];
    costs.push({ label: T('Campsite: {0}', T(site.what)), amount: site.price * nights, detail: T('{0} a night.', { m: site.price }), source: curated.source });
    if (curated.reservationFee) costs.push({ label: T('Booking fee'), amount: curated.reservationFee, source: curated.source });
  } else costs.push({ label: T('Campsite'), amount: null, detail: T('We have not checked this campground’s prices yet.') });
  costs.push({ label: T('Food from home'), amount: 0 });
  costs.push({ label: T('Car: fuel and parking'), amount: null, detail: T('About {0} km each way.', Math.round(km)) });

  return finish({
    category: 'camping',
    title: T('Camping: {0}', name),
    season,
    ramadan,
    days,
    costs,
    currency: cityNear(b.home)?.currency ?? null,
    prepare: [
      T('Tent, sleeping bags and sleeping mats'), T('Flashlights or headlamps'), T('Camp stove, pot and matches'), T('Food in a cool bag, and plenty of water'),
      T('Prayer mat and a bottle of water for wudu'), T('First-aid kit'), T('Warm layers: nights are cold, even in summer'),
      ...(season === 'summer' ? [T('Insect repellent and sunscreen')] : []), T('Rubbish bags'),
    ],
    tips: [T('Book early: campgrounds near cities fill up on summer weekends.')],
    warnings,
  });
}

// ── Labels shared by both screens ────────────────────────────────────

/** Who usually goes out together, from the family list (kids' ages from birth dates). */
export function whoFromFamily(members: { birth_date?: string | null; relationship?: string | null }[]): { who: Who; kids: number[] } {
  const now = Date.now();
  const age = (d?: string | null) => (d ? Math.floor((now - new Date(d).getTime()) / (365.25 * 86_400_000)) : null);
  const isKid = (m: { birth_date?: string | null; relationship?: string | null }) => /son|daughter|child|kid/i.test(m.relationship ?? '') || (age(m.birth_date) ?? 99) < 18;
  const kids = members.filter(isKid).map((m) => age(m.birth_date)).filter((a): a is number => a != null && a >= 0 && a < 18).sort((a, b) => a - b);
  if (members.some(isKid)) return { who: 'family', kids };
  if (members.some((m) => /wife|husband|spouse|partner/i.test(m.relationship ?? ''))) return { who: 'couple', kids: [] };
  return { who: 'single', kids: [] };
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
  camp: 'Campground', food: 'Halal food', restaurant: 'Restaurant', cafe: 'Café', mosque: 'Mosque',
};
export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? 'Place';

/** The kinds people can filter the map by, for "Go out" and "Picnic". */
export const MAP_FILTERS: { id: string; label: string; kinds: string[] }[] = [
  { id: 'kids', label: 'For kids', kinds: ['playground', 'zoo', 'aquarium', 'theme_park', 'water_park', 'trampoline', 'mini_golf', 'planetarium'] },
  { id: 'parks', label: 'Parks and nature', kinds: ['park', 'garden', 'nature', 'picnic', 'viewpoint', 'beach'] },
  { id: 'museums', label: 'Museums and culture', kinds: ['museum', 'gallery', 'arts', 'library', 'planetarium'] },
  { id: 'sport', label: 'Sport and water', kinds: ['pool', 'ice_rink', 'sports', 'water_park', 'beach'] },
  { id: 'indoor', label: 'Indoors', kinds: ['museum', 'aquarium', 'library', 'mall', 'gallery', 'arts', 'planetarium', 'trampoline', 'ice_rink', 'pool'] },
];
export const PICNIC_KINDS = ['park', 'garden', 'picnic', 'nature', 'beach'];

/** Places that suit the season, for the map: water parks and beaches only in summer. */
export const inSeason = (kind: string, season: Season) => !(SUMMER_ONLY.has(kind) && season !== 'summer');
export const goodInWinter = (kind: string) => WINTER_GOOD.has(kind);

/** "Sunny", "Rain"… from the forecast's weather code. */
export function skyLabel(code: number): string {
  if (code >= 95) return 'Thunderstorms';
  if (code >= 71 && code <= 86) return 'Snow';
  if (code >= 51) return 'Rain';
  if (code >= 45) return 'Fog';
  if (code >= 2) return 'Cloudy';
  return 'Sunny';
}

export function directionsLink(p: { lat: number; lng: number }, car = true): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=${car ? 'driving' : 'transit'}`;
}

/** "$43.00" in the city's currency. */
export function money(amount: number, currency: string | null, locale: string): string {
  if (!currency) return amount.toFixed(2);
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

/** The next Saturday and Sunday (on a Sunday, next weekend). */
export function comingWeekend(now = new Date()): { sat: string; sun: string } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toSat = (6 - d.getDay() + 7) % 7 || (d.getDay() === 6 ? 0 : 7);
  const sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (d.getDay() === 6 ? 0 : toSat));
  const sun = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 1);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { sat: iso(sat), sun: iso(sun) };
}

// ── Loading data (the same on the website and in the app) ────────────

/** Any Supabase client: the website's and the app's work the same way. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

function bbox(lat: number, lng: number, km: number): [number, number, number, number] {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

/** Places to visit, halal food and mosques within km of a point. */
export async function loadNearby(db: Db, at: { lat: number; lng: number }, km = 25): Promise<Nearby> {
  const [s, w, n, e] = bbox(at.lat, at.lng, km);
  const [places, halal] = await Promise.all([
    db.from('outing_places').select('key,name,kind,latitude,longitude,address,website,opening_hours,fee,indoor')
      .gte('latitude', s).lte('latitude', n).gte('longitude', w).lte('longitude', e).limit(4000),
    db.from('osm_places').select('key,name,category,latitude,longitude,address,website,opening_hours,halal_status,cuisine')
      .gte('latitude', s).lte('latitude', n).gte('longitude', w).lte('longitude', e)
      .in('halal_status', ['halal', 'halal_only', 'halal_options', 'likely', 'mosque']).limit(3000),
  ]);
  type P = { key: string; name: string; kind: string; latitude: number; longitude: number; address: string | null; website: string | null; opening_hours: string | null; fee: string | null; indoor: boolean };
  type H = { key: string; name: string; category: string; latitude: number; longitude: number; address: string | null; website: string | null; opening_hours: string | null; halal_status: string; cuisine: string | null };
  const spots = ((places.data ?? []) as P[])
    .map((p): Spot => ({ key: p.key, name: p.name, kind: p.kind, lat: p.latitude, lng: p.longitude, address: p.address, website: p.website, hours: p.opening_hours, fee: p.fee, indoor: p.indoor }))
    .filter((p) => !knownPlace(p)?.closed);
  const rows = (halal.data ?? []) as H[];
  const toSpot = (h: H, kind: string): Spot => ({ key: h.key, name: h.name, kind, lat: h.latitude, lng: h.longitude, address: h.address, website: h.website, hours: h.opening_hours, halal: h.halal_status, cuisine: h.cuisine });
  return {
    places: spots,
    food: rows.filter((h) => h.category === 'restaurant' || h.category === 'cafe').map((h) => toSpot(h, h.category)),
    mosques: rows.filter((h) => h.halal_status === 'mosque').map((h) => toSpot(h, 'mosque')),
  };
}

/** The forecast for each date (null beyond the 16 days Open-Meteo covers). */
export async function loadWeather(at: { lat: number; lng: number }, dates: string[]): Promise<(DayWeather | null)[]> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${at.lat.toFixed(3)}&longitude=${at.lng.toFixed(3)}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=16`);
    if (!res.ok) return dates.map(() => null);
    const d = (await res.json()) as { daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; weather_code: number[] } };
    return dates.map((date) => {
      const i = d.daily?.time.indexOf(date) ?? -1;
      if (!d.daily || i < 0) return null;
      return { max: Math.round(d.daily.temperature_2m_max[i]), min: Math.round(d.daily.temperature_2m_min[i]), rain: d.daily.precipitation_probability_max[i] ?? 0, code: d.daily.weather_code[i] };
    });
  } catch {
    return dates.map(() => null);
  }
}

export interface RecipeIdea {
  id: string;
  name: string;
  image: string;
  minutes: number;
}

const SWEET = /cake|gâteau|cookie|biscuit|brownie|muffin|tart|pie|pudding|custard|halwa|halva|baklava|basbousa|kunafa|knafeh|maamoul|ghriba|chebakia|sweet|dessert|cream|caramel|chocolate|date ball|truffle|crepe|pancake|waffle|donut|doughnut|churro|sfenj|qatayef|luqaimat|rice pudding|mahalabia|umm ali/i;
const PICNIC = /sandwich|wrap|salad|pasta salad|kebab|kofta|skewer|samosa|empanada|pie|muffin|cookie|bar|ball|roll|bread|msemen|batbout|fatayer|sfiha|börek|borek|frittata|falafel|hummus|tabbouleh|onigiri|patty|nugget|cake/i;

/** A few library recipes for a moment of the program (never one without its photo). */
export async function loadRecipeIdeas(db: Db, need: RecipeNeed, n = 6): Promise<RecipeIdea[]> {
  const meal = need === 'breakfast' ? ['Breakfast'] : need === 'dinner' ? ['Dinner'] : need === 'lunch' ? ['Lunch'] : need === 'dessert' ? ['Dessert', 'Snack', 'Breakfast'] : need === 'picnic' ? ['Lunch', 'Snack'] : ['Lunch', 'Snack'];
  const { data } = await db.from('recipes')
    .select('id,name,image_path,prep_time_minutes,cook_time_minutes,meal_types!inner(name)')
    .eq('is_active', true).not('image_path', 'is', null).in('meal_types.name', meal).limit(800);
  type R = { id: string; name: string; image_path: string; prep_time_minutes: number | null; cook_time_minutes: number | null; meal_types: { name: string } | null };
  let rows = ((data ?? []) as R[]).map((r) => ({ ...r, minutes: (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0) }));
  if (need === 'dessert') rows = rows.filter((r) => r.meal_types?.name === 'Dessert' || SWEET.test(r.name));
  if (need === 'picnic') rows = rows.filter((r) => PICNIC.test(r.name) && r.minutes <= 60);
  if (need === 'quick') rows = rows.filter((r) => r.minutes > 0 && r.minutes <= 30);
  for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
  return rows.slice(0, n).map((r) => ({ id: r.id, name: r.name, image: r.image_path, minutes: r.minutes }));
}
