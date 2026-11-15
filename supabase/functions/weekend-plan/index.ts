import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Weekend programs: a day (or two) out near where the family lives, built only
 * from real places on OpenStreetMap — parks, museums, beaches, playgrounds,
 * libraries… — plus halal food and the nearest mosque from Firdam's halal map.
 * The day is put together by fixed rules (no AI): real places only, opening days,
 * weather, distance and prayer times, with wording written in English, French and Arabic.
 *
 *   POST { lat, lng, place?, who: "single"|"couple"|"family", kids?: number[] (ages),
 *          style: "simple"|"fancy", budget: "low"|"normal", days: ("sat"|"sun")[], lang }
 *        (signed in) -> { plan }
 *   GET  ?sync=pending | POST ?sync=ingest   background map sync (x-sync-token)
 *   POST ?sync=seed { cities: [{ lat, lng, big? }] }   queue the world's main cities ahead of time
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Sync-Token, x-lunchbox-token",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const env = (n: string) => Deno.env.get(n)?.trim() || undefined;
const USER_AGENT = "Firdam/1.0 (https://firdam.com)";
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const PLANS_PER_DAY = 30;
const RADIUS_M = 25_000;

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = env("SUPABASE_URL")!, key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Database ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function getUser(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get("Authorization");
  const url = env("SUPABASE_URL"), anon = env("SUPABASE_ANON_KEY");
  if (!auth || !url || !anon) return null;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon } });
  return res.ok ? ((await res.json()) as { id: string }) : null;
}

// ── Places, kept per 0.2° map tile (like the halal map) ──────────────

const TILE = 0.2;
const REFRESH_MS = 30 * 24 * 3600_000;
interface Tile { tile: string; south: number; west: number; north: number; east: number }
interface OsmElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

function box(lat: number, lng: number, radius: number): [number, number, number, number] {
  const dLat = radius / 111_320;
  const dLng = radius / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}
function tilesFor(lat: number, lng: number, radius: number): Tile[] {
  const b = box(lat, lng, radius);
  const tiles: Tile[] = [];
  for (let y = Math.floor(b[0] / TILE); y <= Math.floor(b[2] / TILE); y++) {
    for (let x = Math.floor(b[1] / TILE); x <= Math.floor(b[3] / TILE); x++) {
      tiles.push({ tile: `${y}:${x}`, south: +(y * TILE).toFixed(4), west: +(x * TILE).toFixed(4), north: +((y + 1) * TILE).toFixed(4), east: +((x + 1) * TILE).toFixed(4) });
    }
  }
  return tiles;
}

function tileQuery(t: Tile): string {
  return `
    [out:json][timeout:60][bbox:${t.south},${t.west},${t.north},${t.east}];
    (
      nwr["leisure"~"^(park|playground|nature_reserve|garden|water_park|swimming_pool|ice_rink|miniature_golf|trampoline_park|sports_centre)$"]["name"];
      nwr["tourism"~"^(museum|zoo|aquarium|theme_park|attraction|viewpoint|gallery|picnic_site)$"]["name"];
      nwr["amenity"~"^(library|planetarium|arts_centre|community_centre)$"]["name"];
      nwr["natural"="beach"]["name"];
      nwr["shop"="mall"]["name"];
    );
    out center tags 2500;
  `;
}

type Kind =
  | "park" | "playground" | "nature" | "garden" | "water_park" | "pool" | "ice_rink" | "mini_golf" | "trampoline" | "sports"
  | "museum" | "zoo" | "aquarium" | "theme_park" | "attraction" | "viewpoint" | "gallery" | "picnic"
  | "library" | "planetarium" | "arts" | "community" | "beach" | "mall";

const KIND_OF: Record<string, Kind> = {
  park: "park", playground: "playground", nature_reserve: "nature", garden: "garden", water_park: "water_park", swimming_pool: "pool",
  ice_rink: "ice_rink", miniature_golf: "mini_golf", trampoline_park: "trampoline", sports_centre: "sports",
  museum: "museum", zoo: "zoo", aquarium: "aquarium", theme_park: "theme_park", attraction: "attraction", viewpoint: "viewpoint",
  gallery: "gallery", picnic_site: "picnic", library: "library", planetarium: "planetarium", arts_centre: "arts",
  community_centre: "community", beach: "beach", mall: "mall",
};
const INDOOR = new Set<Kind>(["museum", "aquarium", "gallery", "library", "planetarium", "arts", "community", "mall", "ice_rink", "trampoline", "sports"]);
const FOR_KIDS = new Set<Kind>(["park", "playground", "zoo", "aquarium", "theme_park", "water_park", "mini_golf", "trampoline", "library", "planetarium", "beach", "museum", "picnic", "pool"]);
/** Public spaces that are free to enter almost everywhere; shown as "usually free", never "free". */
const USUALLY_FREE = new Set<Kind>(["park", "playground", "library", "viewpoint", "picnic", "beach", "nature", "community", "mall"]);

interface OutingRow {
  key: string; tile: string; name: string; kind: Kind; latitude: number; longitude: number; address: string | null;
  website: string | null; opening_hours: string | null; fee: string | null; indoor: boolean; for_kids: boolean;
}

function normalize(el: OsmElement, tile: string): OutingRow | null {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
  if (!t.name || lat == null || lng == null) return null;
  if (/^(private|no|customers|members)$/.test(t.access ?? "")) return null;
  const raw = t.leisure ?? t.tourism ?? t.amenity ?? (t.natural === "beach" ? "beach" : t.shop === "mall" ? "mall" : "");
  const kind = KIND_OF[raw];
  if (!kind) return null;
  // Small parks without anything to do aren't a day out; keep the named ones only (already required).
  const fee = t.fee === "no" ? "no" : t.fee === "yes" || /^\d/.test(t.fee ?? "") || t.charge ? "yes" : USUALLY_FREE.has(kind) ? "usually_free" : null;
  const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean).join(" ") || null;
  return {
    key: `${el.type}/${el.id}`, tile, name: t.name.slice(0, 120), kind, latitude: lat, longitude: lng, address,
    website: (t.website ?? t["contact:website"] ?? null)?.slice(0, 300) ?? null, opening_hours: t.opening_hours?.slice(0, 200) ?? null,
    fee, indoor: INDOOR.has(kind) || t.indoor === "yes" || t.covered === "yes", for_kids: FOR_KIDS.has(kind),
  };
}

async function ingestTile(t: Tile, elements: OsmElement[]): Promise<number> {
  const started = new Date().toISOString();
  const rows = new Map<string, OutingRow>();
  for (const el of elements) {
    const r = normalize(el, t.tile);
    if (r) rows.set(r.key, r);
  }
  const list = [...rows.values()].map((r) => ({ ...r, updated_at: started }));
  for (let i = 0; i < list.length; i += 500) {
    await rest("outing_places?on_conflict=key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(list.slice(i, i + 500)) });
  }
  await rest(`outing_places?tile=eq.${encodeURIComponent(t.tile)}&updated_at=lt.${encodeURIComponent(started)}`, { method: "DELETE" });
  await rest("outing_areas?on_conflict=tile", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ ...t, fetched_at: started }]) });
  return list.length;
}

async function overpass(query: string, budgetMs: number): Promise<OsmElement[]> {
  const deadline = Date.now() + budgetMs;
  for (const endpoint of OVERPASS) {
    const left = deadline - Date.now();
    if (left < 2_000) break;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(left),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: OsmElement[]; remark?: string };
      if (!data.elements?.length && data.remark) continue;
      return data.elements ?? [];
    } catch { /* try the next server */ }
  }
  throw new Error("The map servers are busy.");
}

/** Marks the area as wanted (the background job keeps it fresh) and fetches the centre now if it's new. */
async function ensureArea(lat: number, lng: number): Promise<boolean> {
  const tiles = tilesFor(lat, lng, RADIUS_M);
  const known = await rest<{ tile: string; fetched_at: string | null }[]>(`outing_areas?select=tile,fetched_at&tile=in.(${tiles.map((t) => `"${t.tile}"`).join(",")})`);
  const fetched = new Map(known.map((k) => [k.tile, k.fetched_at]));
  const now = new Date().toISOString();
  await rest("outing_areas?on_conflict=tile", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(tiles.map((t) => ({ ...t, requested_at: now }))) });
  const centre = tiles.find((t) => lat >= t.south && lat < t.north && lng >= t.west && lng < t.east);
  if (centre && !fetched.get(centre.tile)) {
    try {
      await ingestTile(centre, await overpass(tileQuery(centre), 20_000));
      fetched.set(centre.tile, now);
    } catch (e) {
      console.error("live fetch", (e as Error).message);
    }
  }
  return tiles.some((t) => !fetched.get(t.tile));
}

// ── Weather (Open-Meteo, no key) ─────────────────────────────────────

interface DayWeather { date: string; max: number; min: number; rain: number; code: number; prayers?: { dhuhr: string; asr: string; maghrib: string } }

/** Approximate Dhuhr, Asr (shadow = 1) and Maghrib from sunrise and sunset (local "HH:MM" strings). */
function prayersFor(date: string, lat: number, sunrise: string, sunset: string): { dhuhr: string; asr: string; maghrib: string } | undefined {
  const mins = (t: string) => { const m = t.match(/T(\d{2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : NaN; };
  const rise = mins(sunrise), set = mins(sunset);
  if (!Number.isFinite(rise) || !Number.isFinite(set)) return undefined;
  const noon = (rise + set) / 2;
  const day = Math.floor((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${date.slice(0, 4)}-01-01T00:00:00Z`)) / 86_400_000) + 1;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10)) * (Math.PI / 180);
  const phi = lat * (Math.PI / 180);
  const alt = Math.atan(1 / (1 + Math.tan(Math.abs(phi - decl))));
  const cosH = (Math.sin(alt) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return undefined;
  const asr = noon + ((Math.acos(cosH) * 180) / Math.PI / 15) * 60;
  const hm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m % 60) % 60).padStart(2, "0")}`;
  return { dhuhr: hm(noon + 2), asr: hm(asr + 1), maghrib: hm(set + 3) };
}
async function weekendWeather(lat: number, lng: number): Promise<{ sat: DayWeather | null; sun: DayWeather | null; satDate: string; sunDate: string }> {
  const fallback = () => {
    const d = new Date();
    const toSat = (6 - d.getUTCDay() + 7) % 7;
    const sat = new Date(d.getTime() + toSat * 86_400_000);
    const sun = new Date(sat.getTime() + 86_400_000);
    return { sat: null, sun: null, satDate: sat.toISOString().slice(0, 10), sunDate: sun.toISOString().slice(0, 10) };
  };
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset&timezone=auto&forecast_days=8`,
      { signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return fallback();
    const d = (await res.json()) as { daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; weather_code: number[]; sunrise?: string[]; sunset?: string[] } };
    const daily = d.daily;
    if (!daily?.time?.length) return fallback();
    const day = (i: number): DayWeather => ({ date: daily.time[i], max: Math.round(daily.temperature_2m_max[i]), min: Math.round(daily.temperature_2m_min[i]), rain: daily.precipitation_probability_max[i] ?? 0, code: daily.weather_code[i], prayers: daily.sunrise?.[i] && daily.sunset?.[i] ? prayersFor(daily.time[i], lat, daily.sunrise[i], daily.sunset[i]) : undefined });
    // The first day is "today" in the place's own time zone.
    const weekday = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay();
    // The coming weekend: Saturday, then the Sunday after it (on a Sunday that's next weekend).
    const satI = daily.time.findIndex((s) => weekday(s) === 6);
    const sunI = daily.time.findIndex((s, i) => weekday(s) === 0 && satI >= 0 && i > satI);
    return {
      sat: satI >= 0 ? day(satI) : null,
      sun: sunI >= 0 ? day(sunI) : null,
      satDate: satI >= 0 ? daily.time[satI] : fallback().satDate,
      sunDate: sunI >= 0 ? daily.time[sunI] : fallback().sunDate,
    };
  } catch {
    return fallback();
  }
}

function weatherWords(w: DayWeather | null): string {
  if (!w) return "forecast not available yet";
  const sky = w.code >= 95 ? "thunderstorms" : w.code >= 71 && w.code <= 86 ? "snow" : w.code >= 51 ? "rain" : w.code >= 45 ? "fog" : w.code >= 2 ? "cloudy" : "sunny";
  return `${sky}, ${w.min}–${w.max}°C, ${w.rain}% chance of rain`;
}

// ── Opening hours (OpenStreetMap's opening_hours, the common forms) ──

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
function expandDays(spec: string): string[] {
  const out: string[] = [];
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-").map((x) => x.trim());
    const i = WEEK.indexOf(a), j = b ? WEEK.indexOf(b) : i;
    if (i < 0 || j < 0) continue;
    for (let k = i; ; k = (k + 1) % 7) { out.push(WEEK[k]); if (k === j) break; }
  }
  return out;
}
/** true / false when the hours say whether it's open that day, null when we can't tell. */
export function openOn(hours: string | null | undefined, day: "Sa" | "Su"): boolean | null {
  if (!hours) return null;
  const h = hours.trim();
  if (/24\/7/.test(h)) return true;
  if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|easter|sunrise|sunset)\b/i.test(h)) return null;
  let known = false, open = false;
  for (const rule of h.split(";")) {
    const r = rule.trim();
    if (!r) continue;
    const m = r.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su|PH)(?:\s*[-,]\s*(?:Mo|Tu|We|Th|Fr|Sa|Su|PH))*)\s*(.*)$/);
    if (!m) {
      if (/^\d{1,2}:\d{2}/.test(r)) { known = true; open = true; }
      continue;
    }
    known = true;
    if (expandDays(m[1].replace(/\s/g, "").replace(/,?PH/g, "")).includes(day)) open = !/\b(off|closed)\b/i.test(m[2]);
  }
  return known ? open : null;
}

// ── The program ──────────────────────────────────────────────────────

const distKm = (a: number, b: number, c: number, d: number) => {
  const R = 6371, toR = Math.PI / 180;
  const x = Math.sin(((c - a) * toR) / 2) ** 2 + Math.cos(a * toR) * Math.cos(c * toR) * Math.sin(((d - b) * toR) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

interface Options { lat: number; lng: number; place?: string; who: "single" | "couple" | "family"; kids: number[]; style: "simple" | "fancy"; budget: "low" | "normal"; days: ("sat" | "sun")[]; lang: "en" | "fr" | "ar" }
interface FoodRow { key: string; name: string; category: string; latitude: number; longitude: number; address: string | null; website: string | null; opening_hours: string | null; halal_status: string; cuisine: string | null }

type Lang = "en" | "fr" | "ar";

// ── Fixed wording: every sentence the planner can write, in three languages ──
// No AI writes anything here: the program is assembled from these sentences and real map data.

const TEXT: Record<string, { fr: string; ar: string }> = {
  // What you do at each kind of place
  "Time at the park": { fr: "Moment au parc", ar: "وقت في الحديقة العامة" },
  "Playground": { fr: "Aire de jeux", ar: "ساحة ألعاب الأطفال" },
  "Nature walk": { fr: "Balade en nature", ar: "نزهة في الطبيعة" },
  "Garden walk": { fr: "Promenade au jardin", ar: "نزهة في الحديقة" },
  "Water park": { fr: "Parc aquatique", ar: "حديقة مائية" },
  "Swimming": { fr: "Baignade", ar: "سباحة" },
  "Ice skating": { fr: "Patinage", ar: "تزلج على الجليد" },
  "Mini golf": { fr: "Minigolf", ar: "غولف مصغّر" },
  "Trampoline park": { fr: "Parc de trampolines", ar: "صالة الترامبولين" },
  "Sport": { fr: "Sport", ar: "رياضة" },
  "Museum visit": { fr: "Visite du musée", ar: "زيارة المتحف" },
  "Zoo visit": { fr: "Visite du zoo", ar: "زيارة حديقة الحيوانات" },
  "Aquarium visit": { fr: "Visite de l'aquarium", ar: "زيارة حوض الأسماك" },
  "Theme park": { fr: "Parc d'attractions", ar: "مدينة الألعاب" },
  "Sightseeing": { fr: "Lieu à découvrir", ar: "زيارة معلم محلي" },
  "Viewpoint": { fr: "Point de vue", ar: "إطلالة بانورامية" },
  "Art gallery": { fr: "Galerie d'art", ar: "معرض فني" },
  "Picnic area": { fr: "Aire de pique-nique", ar: "مكان للنزهة والأكل" },
  "Library visit": { fr: "Visite de la bibliothèque", ar: "زيارة المكتبة" },
  "Planetarium": { fr: "Planétarium", ar: "القبة الفلكية" },
  "Arts centre": { fr: "Centre culturel", ar: "مركز فني وثقافي" },
  "Community centre": { fr: "Centre communautaire", ar: "مركز مجتمعي" },
  "Beach time": { fr: "Moment à la plage", ar: "وقت على الشاطئ" },
  "Shopping centre walk": { fr: "Balade au centre commercial", ar: "جولة في المركز التجاري" },

  "Walk, play and enjoy the fresh air.": { fr: "Marchez, jouez et profitez du grand air.", ar: "مشي ولعب واستمتاع بالهواء الطلق." },
  "The children play while you rest nearby.": { fr: "Les enfants jouent pendant que vous vous reposez à côté.", ar: "لعب للأطفال مع استراحة للكبار بالقرب منهم." },
  "Wear comfortable shoes and stay on the marked paths.": { fr: "Portez des chaussures confortables et restez sur les sentiers balisés.", ar: "يُنصح بأحذية مريحة والبقاء على المسارات المحددة." },
  "A calm walk among the trees and flowers.": { fr: "Une promenade calme entre les arbres et les fleurs.", ar: "نزهة هادئة بين الأشجار والزهور." },
  "Water fun: stay together and take breaks in the shade.": { fr: "Jeux d'eau : restez ensemble et faites des pauses à l'ombre.", ar: "مرح في الماء، مع البقاء معًا وأخذ استراحات في الظل." },
  "Check the public swimming times before you go.": { fr: "Vérifiez les horaires de baignade publique avant de partir.", ar: "يُستحسن التحقق من أوقات السباحة العامة قبل الذهاب." },
  "Dress warmly, and ask at the desk about renting skates.": { fr: "Habillez-vous chaudement et renseignez-vous à l'accueil pour louer des patins.", ar: "ملابس دافئة، والسؤال في الاستقبال عن استئجار الزلاجات." },
  "A friendly game for everyone.": { fr: "Une partie amicale pour tout le monde.", ar: "لعبة ودية للجميع." },
  "Some places ask for special socks: check before you go.": { fr: "Certains lieux demandent des chaussettes spéciales : vérifiez avant de partir.", ar: "بعض الأماكن تطلب جوارب خاصة، فيُستحسن التحقق قبل الذهاب." },
  "Check what is open to the public today.": { fr: "Vérifiez ce qui est ouvert au public aujourd'hui.", ar: "يُستحسن التحقق مما هو متاح للعموم اليوم." },
  "Discover the exhibits at your own pace.": { fr: "Découvrez les expositions à votre rythme.", ar: "اكتشاف المعروضات على مهل." },
  "Start with the animals you most want to see.": { fr: "Commencez par les animaux que vous voulez le plus voir.", ar: "البدء بالحيوانات الأكثر رغبة في رؤيتها." },
  "Sea life up close.": { fr: "La vie marine de tout près.", ar: "الحياة البحرية عن قرب." },
  "Arrive early: queues get longer during the day.": { fr: "Arrivez tôt : les files s'allongent au fil de la journée.", ar: "الوصول مبكرًا أفضل، فالطوابير تطول خلال اليوم." },
  "A local sight to discover.": { fr: "Un lieu à découvrir.", ar: "معلم محلي للاكتشاف." },
  "Enjoy the view and take a few photos.": { fr: "Profitez de la vue et prenez quelques photos.", ar: "استمتاع بالمنظر والتقاط بعض الصور." },
  "Look at the art at your own pace.": { fr: "Admirez les œuvres à votre rythme.", ar: "تأمّل الأعمال الفنية على مهل." },
  "A place to sit, eat and relax.": { fr: "Un endroit pour s'asseoir, manger et se détendre.", ar: "مكان للجلوس والأكل والراحة." },
  "Read, borrow books and enjoy the calm.": { fr: "Lisez, empruntez des livres et profitez du calme.", ar: "قراءة واستعارة كتب واستمتاع بالهدوء." },
  "Learn about the stars and planets.": { fr: "Découvrez les étoiles et les planètes.", ar: "التعرّف على النجوم والكواكب." },
  "See what is on today.": { fr: "Voyez ce qui est au programme aujourd'hui.", ar: "الاطلاع على برنامج اليوم." },
  "Stay together near the water and take breaks in the shade.": { fr: "Restez ensemble près de l'eau et faites des pauses à l'ombre.", ar: "البقاء معًا قرب الماء وأخذ استراحات في الظل." },
  "A walk indoors, away from the cold and the rain.": { fr: "Une balade à l'intérieur, à l'abri du froid et de la pluie.", ar: "مشي في مكان مغلق، بعيدًا عن البرد والمطر." },

  // Entry
  "Free entry.": { fr: "Entrée gratuite.", ar: "الدخول مجاني." },
  "Usually free to enter.": { fr: "Généralement gratuit.", ar: "الدخول مجاني عادةً." },
  "Paid entry: check the price on their website.": { fr: "Entrée payante : vérifiez le prix sur leur site.", ar: "الدخول بمقابل: يُستحسن التحقق من السعر على موقعهم." },
  "Entry price unknown: check before you go.": { fr: "Prix d'entrée inconnu : vérifiez avant de partir.", ar: "سعر الدخول غير معروف: يُستحسن التحقق قبل الذهاب." },

  // How long
  "About 45 minutes here.": { fr: "Environ 45 minutes sur place.", ar: "حوالي 45 دقيقة هنا." },
  "About an hour here.": { fr: "Environ une heure sur place.", ar: "حوالي ساعة هنا." },
  "About an hour and a half here.": { fr: "Environ une heure et demie sur place.", ar: "حوالي ساعة ونصف هنا." },
  "About 2 hours here.": { fr: "Environ 2 heures sur place.", ar: "حوالي ساعتين هنا." },
  "About 2 and a half hours here.": { fr: "Environ 2 heures et demie sur place.", ar: "حوالي ساعتين ونصف هنا." },
  "About 3 hours here.": { fr: "Environ 3 heures sur place.", ar: "حوالي ثلاث ساعات هنا." },
  "About 4 hours here.": { fr: "Environ 4 heures sur place.", ar: "حوالي أربع ساعات هنا." },

  // Meals
  "Picnic lunch": { fr: "Déjeuner pique-nique", ar: "غداء في الهواء الطلق" },
  "Eat the lunch you packed from home.": { fr: "Mangez le repas préparé à la maison.", ar: "تناول الغداء المحضَّر في البيت." },
  "Lunch from home": { fr: "Déjeuner apporté de la maison", ar: "غداء من البيت" },
  "Eat the lunch you packed, where eating is allowed.": { fr: "Mangez le repas préparé, là où c'est permis.", ar: "تناول الغداء المحضَّر في مكان يُسمح فيه بالأكل." },
  "Lunch": { fr: "Déjeuner", ar: "الغداء" },
  "Lunch at a restaurant": { fr: "Déjeuner au restaurant", ar: "غداء في مطعم" },
  "Tea and dessert": { fr: "Thé et dessert", ar: "شاي وحلوى" },
  "Marked halal on the map. It is still good to ask.": { fr: "Indiqué halal sur la carte. Mieux vaut quand même demander.", ar: "مصنَّف حلالًا على الخريطة، ومع ذلك يُستحسن السؤال." },
  "Has halal options: ask which dishes are halal.": { fr: "Propose des plats halal : demandez lesquels.", ar: "يقدّم خيارات حلال: يُستحسن السؤال عن الأطباق الحلال." },
  "Often halal, not confirmed: ask before you order.": { fr: "Souvent halal, non confirmé : demandez avant de commander.", ar: "حلال غالبًا لكن غير مؤكد: يجب السؤال قبل الطلب." },
  "Check the menu prices before you go.": { fr: "Vérifiez les prix du menu avant d'y aller.", ar: "يُستحسن الاطلاع على الأسعار قبل الذهاب." },

  // Prayer and the day's frame
  "Dhuhr prayer": { fr: "Prière du Dhuhr", ar: "صلاة الظهر" },
  "Asr prayer": { fr: "Prière de l'Asr", ar: "صلاة العصر" },
  "Maghrib prayer": { fr: "Prière du Maghrib", ar: "صلاة المغرب" },
  "Maghrib prayer, then home": { fr: "Prière du Maghrib, puis retour à la maison", ar: "صلاة المغرب ثم العودة إلى البيت" },
  "At the nearest mosque on the way. Times are approximate: check with the mosque.": { fr: "À la mosquée la plus proche sur le chemin. Les horaires sont approximatifs : vérifiez auprès de la mosquée.", ar: "في أقرب مسجد على الطريق. الأوقات تقريبية، فيُستحسن التأكد من المسجد." },
  "Pray at a clean, quiet spot with your prayer mat. Times are approximate.": { fr: "Priez dans un endroit propre et calme avec votre tapis. Les horaires sont approximatifs.", ar: "الصلاة في مكان نظيف وهادئ على سجادة الصلاة. الأوقات تقريبية." },
  "Pray at home or on the way. Times are approximate.": { fr: "Priez à la maison ou en chemin. Les horaires sont approximatifs.", ar: "الصلاة في البيت أو في الطريق. الأوقات تقريبية." },
  "Its time starts at about {0}.": { fr: "Son heure commence vers {0}.", ar: "يبدأ وقتها نحو الساعة {0}." },
  "Head home": { fr: "Retour à la maison", ar: "العودة إلى البيت" },
  "Time to head home and rest.": { fr: "C'est l'heure de rentrer et de se reposer.", ar: "حان وقت العودة إلى البيت والراحة." },
  "Get ready": { fr: "Préparatifs", ar: "الاستعداد" },
  "Breakfast at home, then pack the bag (see the list below).": { fr: "Petit-déjeuner à la maison, puis préparez le sac (voir la liste plus bas).", ar: "فطور في البيت، ثم تجهيز الحقيبة (انظر القائمة في الأسفل)." },
  "Check today's prayer times before you leave.": { fr: "Vérifiez les horaires de prière du jour avant de partir.", ar: "يُستحسن التحقق من أوقات الصلاة لهذا اليوم قبل الخروج." },

  // Titles
  "A family weekend in {0}": { fr: "Un week-end en famille à {0}", ar: "عطلة نهاية أسبوع عائلية في {0}" },
  "A weekend for two in {0}": { fr: "Un week-end à deux à {0}", ar: "عطلة نهاية أسبوع للزوجين في {0}" },
  "Your weekend in {0}": { fr: "Votre week-end à {0}", ar: "عطلة نهاية أسبوعك في {0}" },
  "A family weekend near you": { fr: "Un week-end en famille près de chez vous", ar: "عطلة نهاية أسبوع عائلية قريبة منك" },
  "A weekend for two near you": { fr: "Un week-end à deux près de chez vous", ar: "عطلة نهاية أسبوع للزوجين قريبة منك" },
  "Your weekend nearby": { fr: "Votre week-end tout près", ar: "عطلة نهاية أسبوعك بالقرب منك" },

  // Before you go
  "Prayer mat and a small bottle of water for wudu": { fr: "Tapis de prière et une petite bouteille d'eau pour les ablutions", ar: "سجادة صلاة وقارورة ماء صغيرة للوضوء" },
  "Water bottles for everyone": { fr: "Des bouteilles d'eau pour tout le monde", ar: "قوارير ماء للجميع" },
  "Snacks for the children": { fr: "Des collations pour les enfants", ar: "وجبات خفيفة للأطفال" },
  "Stroller, nappies and wipes": { fr: "Poussette, couches et lingettes", ar: "عربة الطفل والحفاضات والمناديل المبللة" },
  "Packed lunch and a blanket to sit on": { fr: "Le déjeuner préparé et une couverture pour s'asseoir", ar: "الغداء المحضَّر وبطانية للجلوس" },
  "Packed lunch in a cool bag": { fr: "Le déjeuner préparé dans un sac isotherme", ar: "الغداء المحضَّر في حقيبة تبريد" },
  "Umbrellas or rain jackets": { fr: "Parapluies ou imperméables", ar: "مظلات أو معاطف مطر" },
  "Warm coats, hats and gloves": { fr: "Manteaux chauds, bonnets et gants", ar: "معاطف دافئة وقبعات وقفازات" },
  "Sunscreen, hats and sunglasses": { fr: "Crème solaire, chapeaux et lunettes de soleil", ar: "واقي الشمس وقبعات ونظارات شمسية" },
  "Swimsuits and towels": { fr: "Maillots de bain et serviettes", ar: "ملابس سباحة ومناشف" },
  "A card or some cash for tickets": { fr: "Une carte ou un peu d'argent pour les billets", ar: "بطاقة أو بعض النقود للتذاكر" },
  "Ask the restaurant if the food is halal before ordering": { fr: "Demandez au restaurant si la nourriture est halal avant de commander", ar: "السؤال في المطعم عن كون الطعام حلالًا قبل الطلب" },
  "Comfortable walking shoes": { fr: "Des chaussures confortables pour marcher", ar: "أحذية مريحة للمشي" },
  "Plan the trip: car, bus or train": { fr: "Prévoyez le trajet : voiture, bus ou train", ar: "التخطيط للتنقل: سيارة أو حافلة أو قطار" },
  "Charged phone, and a look at the opening hours before leaving": { fr: "Un téléphone chargé, et un coup d'œil aux horaires avant de partir", ar: "هاتف مشحون، والتحقق من أوقات الفتح قبل الخروج" },

  // Money
  "Everything planned here is free or usually free.": { fr: "Tout ce qui est prévu ici est gratuit ou généralement gratuit.", ar: "كل ما في هذا البرنامج مجاني أو مجاني عادةً." },
  "Some places charge an entry fee: check the prices on their websites.": { fr: "Certains lieux sont payants : vérifiez les prix sur leurs sites.", ar: "بعض الأماكن تتطلب رسوم دخول: يُستحسن التحقق من الأسعار على مواقعها." },
  "Entry prices are unknown for some places: check before you go.": { fr: "Le prix d'entrée de certains lieux est inconnu : vérifiez avant de partir.", ar: "أسعار الدخول غير معروفة لبعض الأماكن: يُستحسن التحقق قبل الذهاب." },
  "Meals out cost money: check the menu prices.": { fr: "Les repas à l'extérieur sont payants : regardez les prix du menu.", ar: "الوجبات خارج البيت بمقابل: يُستحسن الاطلاع على الأسعار." },
  "Meals come from home, so food costs stay low.": { fr: "Les repas viennent de la maison : la nourriture coûte peu.", ar: "الوجبات من البيت، فتبقى تكلفة الطعام منخفضة." },
  "Transport is extra.": { fr: "Le transport est en plus.", ar: "التنقل بتكلفة إضافية." },
};

function t(lang: Lang, en: string, args: (string | number)[] = []): string {
  const s = lang === "en" ? en : TEXT[en]?.[lang];
  if (s == null) throw new Error(`Missing ${lang} wording: ${en}`);
  return s.replace(/\{(\d)\}/g, (_, i) => String(args[+i] ?? ""));
}

const KIND_TEXT: Record<Kind, { title: string; note: string; minutes: number }> = {
  park: { title: "Time at the park", note: "Walk, play and enjoy the fresh air.", minutes: 90 },
  playground: { title: "Playground", note: "The children play while you rest nearby.", minutes: 60 },
  nature: { title: "Nature walk", note: "Wear comfortable shoes and stay on the marked paths.", minutes: 120 },
  garden: { title: "Garden walk", note: "A calm walk among the trees and flowers.", minutes: 60 },
  water_park: { title: "Water park", note: "Water fun: stay together and take breaks in the shade.", minutes: 180 },
  pool: { title: "Swimming", note: "Check the public swimming times before you go.", minutes: 90 },
  ice_rink: { title: "Ice skating", note: "Dress warmly, and ask at the desk about renting skates.", minutes: 60 },
  mini_golf: { title: "Mini golf", note: "A friendly game for everyone.", minutes: 60 },
  trampoline: { title: "Trampoline park", note: "Some places ask for special socks: check before you go.", minutes: 60 },
  sports: { title: "Sport", note: "Check what is open to the public today.", minutes: 90 },
  museum: { title: "Museum visit", note: "Discover the exhibits at your own pace.", minutes: 120 },
  zoo: { title: "Zoo visit", note: "Start with the animals you most want to see.", minutes: 180 },
  aquarium: { title: "Aquarium visit", note: "Sea life up close.", minutes: 120 },
  theme_park: { title: "Theme park", note: "Arrive early: queues get longer during the day.", minutes: 240 },
  attraction: { title: "Sightseeing", note: "A local sight to discover.", minutes: 45 },
  viewpoint: { title: "Viewpoint", note: "Enjoy the view and take a few photos.", minutes: 45 },
  gallery: { title: "Art gallery", note: "Look at the art at your own pace.", minutes: 60 },
  picnic: { title: "Picnic area", note: "A place to sit, eat and relax.", minutes: 60 },
  library: { title: "Library visit", note: "Read, borrow books and enjoy the calm.", minutes: 60 },
  planetarium: { title: "Planetarium", note: "Learn about the stars and planets.", minutes: 90 },
  arts: { title: "Arts centre", note: "See what is on today.", minutes: 60 },
  community: { title: "Community centre", note: "See what is on today.", minutes: 60 },
  beach: { title: "Beach time", note: "Stay together near the water and take breaks in the shade.", minutes: 150 },
  mall: { title: "Shopping centre walk", note: "A walk indoors, away from the cold and the rain.", minutes: 60 },
};
const HOW_LONG: [number, string][] = [
  [240, "About 4 hours here."], [180, "About 3 hours here."], [150, "About 2 and a half hours here."], [120, "About 2 hours here."],
  [90, "About an hour and a half here."], [60, "About an hour here."], [45, "About 45 minutes here."],
];

/** Which places make the heart of the day, best first. */
const MAIN: Record<Options["who"], { out: Kind[]; in: Kind[] }> = {
  family: {
    out: ["zoo", "theme_park", "aquarium", "water_park", "beach", "park", "museum", "nature", "planetarium", "mini_golf", "garden", "library"],
    in: ["museum", "aquarium", "planetarium", "library", "trampoline", "ice_rink", "pool", "arts", "mall"],
  },
  couple: {
    out: ["garden", "nature", "viewpoint", "museum", "park", "gallery", "beach", "aquarium", "zoo", "arts", "attraction"],
    in: ["museum", "gallery", "arts", "planetarium", "aquarium", "library", "mall"],
  },
  single: {
    out: ["nature", "museum", "park", "viewpoint", "garden", "gallery", "library", "beach", "attraction"],
    in: ["museum", "library", "gallery", "arts", "planetarium", "sports", "mall"],
  },
};
/** A lighter end to the afternoon. */
const LIGHT: Record<Options["who"], { out: Kind[]; in: Kind[] }> = {
  family: { out: ["playground", "park", "garden", "library", "picnic"], in: ["library", "mall", "community"] },
  couple: { out: ["viewpoint", "garden", "park", "gallery"], in: ["gallery", "library", "mall"] },
  single: { out: ["viewpoint", "garden", "park", "library"], in: ["library", "gallery", "mall"] },
};
const BIG_PAID = new Set<Kind>(["theme_park", "zoo", "aquarium", "water_park", "planetarium"]);
const PICNIC_OK = new Set<Kind>(["park", "garden", "picnic", "nature", "beach"]);

const toMin = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
const hm = (m: number) => { const r = Math.round(m); return `${String(Math.floor(r / 60) % 24).padStart(2, "0")}:${String(r % 60).padStart(2, "0")}`; };
const up5 = (m: number) => Math.ceil(m / 5) * 5;

interface Step { time: string | null; prayer: "dhuhr" | "asr" | "maghrib" | null; title: string; note: string; place: Record<string, unknown> | null }
interface Pt { latitude: number; longitude: number }

function placeCard(p: OutingRow, km: number) {
  return { key: p.key, kind: p.kind, name: p.name, lat: p.latitude, lng: p.longitude, address: p.address, website: p.website, hours: p.opening_hours, fee: p.fee, indoor: p.indoor, km: +km.toFixed(1) };
}
function foodCard(f: FoodRow, km: number) {
  return { key: f.key, kind: "food", name: f.name, lat: f.latitude, lng: f.longitude, address: f.address, website: f.website, hours: f.opening_hours, halal: f.halal_status, cuisine: f.cuisine, km: +km.toFixed(1) };
}
function mosqueCard(f: FoodRow, km: number) {
  return { key: f.key, kind: "mosque", name: f.name, lat: f.latitude, lng: f.longitude, address: f.address, km: +km.toFixed(1) };
}
const halalNote = (s: string) =>
  s === "halal" || s === "halal_only" ? "Marked halal on the map. It is still good to ask." : s === "halal_options" ? "Has halal options: ask which dishes are halal." : "Often halal, not confirmed: ask before you order.";
const feeNote = (f: string | null) =>
  f === "no" ? "Free entry." : f === "usually_free" ? "Usually free to enter." : f === "yes" ? "Paid entry: check the price on their website." : "Entry price unknown: check before you go.";

async function makePlan(o: Options) {
  const L = (en: string, args: (string | number)[] = []) => t(o.lang, en, args);
  const stillLoading = await ensureArea(o.lat, o.lng);
  const b = box(o.lat, o.lng, RADIUS_M);
  const [outings, foodRows, weather] = await Promise.all([
    rest<OutingRow[]>(`outing_places?select=*&latitude=gte.${b[0]}&latitude=lte.${b[2]}&longitude=gte.${b[1]}&longitude=lte.${b[3]}&limit=5000`),
    rest<FoodRow[]>(`osm_places?select=key,name,category,latitude,longitude,address,website,opening_hours,halal_status,cuisine&latitude=gte.${b[0]}&latitude=lte.${b[2]}&longitude=gte.${b[1]}&longitude=lte.${b[3]}&halal_status=in.(halal,halal_only,halal_options,likely,mosque)&limit=3000`),
    weekendWeather(o.lat, o.lng),
  ]);

  const young = o.kids.some((a) => a < 4);
  const suits = (p: OutingRow) =>
    (o.budget === "low" ? p.fee !== "yes" : true) &&
    (o.who === "family"
      ? (p.for_kids || ["garden", "viewpoint", "nature", "gallery", "arts", "mall", "community"].includes(p.kind)) && !(young && ["trampoline", "ice_rink", "mini_golf"].includes(p.kind))
      : p.kind !== "playground");
  const places = outings.filter(suits);
  if (places.length < 3) {
    return { error: stillLoading ? "We're still gathering places near you. Try again in a few minutes." : "We couldn't find enough places near this location for a program." };
  }
  const meals = foodRows.filter((f) => f.category === "restaurant" || f.category === "cafe");
  const mosques = foodRows.filter((f) => f.halal_status === "mosque");
  const home: Pt = { latitude: o.lat, longitude: o.lng };
  const km = (a: Pt, c: Pt) => distKm(a.latitude, a.longitude, c.latitude, c.longitude);
  const used = new Set<string>();
  const kindsUsed: Kind[] = [];
  const paid = { yes: false, unknown: false, out: false, home: false, likely: false, water: false, picnic: false, packed: false };

  const dayKeys = o.days.length ? o.days : (["sat"] as ("sat" | "sun")[]);
  const planDays = dayKeys.map((key) => {
    const w = key === "sat" ? weather.sat : weather.sun;
    const date = key === "sat" ? weather.satDate : weather.sunDate;
    const code = key === "sat" ? "Sa" : "Su";
    const bad = !!w && (w.code >= 51 || w.rain >= 60 || w.max < 3);
    const warm = !!w && !bad && w.max >= 22;
    const open = (h: string | null) => openOn(h, code) !== false;
    const pool = places.filter((p) => !used.has(p.key) && open(p.opening_hours) && (warm || !["beach", "water_park"].includes(p.kind)));

    // Pick the best place of the wanted kinds: earlier kinds first, close by, a little variety.
    const pick = (kinds: Kind[], from: Pt, perKm: number, maxKm: number, avoid: Kind[] = []) => {
      let best: { p: OutingRow; s: number } | null = null;
      for (const p of pool) {
        const i = kinds.indexOf(p.kind);
        if (i < 0 || used.has(p.key) || avoid.includes(p.kind)) continue;
        const d = km(from, p);
        if (d > maxKm) continue;
        let s = (kinds.length - i) * 0.8 - d * perKm + Math.random() * 1.5;
        if (BIG_PAID.has(p.kind)) s += o.style === "fancy" ? 1 : -1.5;
        if (o.budget === "low" && (p.fee === "no" || p.fee === "usually_free")) s += 1;
        if (kindsUsed.includes(p.kind)) s -= 1.5;
        if (!best || s > best.s) best = { p, s };
      }
      return best?.p ?? null;
    };
    const main = MAIN[o.who], light = LIGHT[o.who];
    const kindsA = bad ? main.in : main.out;
    const a = pick(kindsA, home, 0.12, RADIUS_M / 1000) ?? pick([...main.in, ...main.out], home, 0.12, RADIUS_M / 1000);
    if (a) used.add(a.key);
    const kindsB = bad ? main.in : [...main.out, ...main.in];
    const bp = a ? (pick(kindsB, a, 0.6, 6, [a.kind]) ?? pick(kindsB, a, 0.4, 15, [a.kind])) : null;
    if (bp) used.add(bp.key);
    const c = bp ? pick(bad ? light.in : light.out, bp, 0.8, 4, [bp.kind]) : null;
    if (c) used.add(c.key);
    for (const p of [a, bp, c]) if (p) kindsUsed.push(p.kind);

    const steps: Step[] = [];
    const prayers = w?.prayers;
    const maghrib = prayers ? toMin(prayers.maghrib) : null;
    const end = maghrib != null ? Math.min(maghrib, 19 * 60) : 18 * 60;
    let cursor = o.style === "fancy" ? 10 * 60 + 30 : 10 * 60;
    let here: Pt = home;
    const travel = (to: Pt) => { const d = km(here, to); return d < 0.8 ? 5 : d < 3 ? 15 : d < 10 ? 25 : 40; };
    const nearestOf = <T extends Pt>(list: T[], maxKm: number, ok: (x: T) => boolean = () => true) => {
      let best: { x: T; d: number } | null = null;
      for (const x of list) { if (!ok(x)) continue; const d = km(here, x); if (d <= maxKm && (!best || d < best.d)) best = { x, d }; }
      return best;
    };

    steps.push({ time: hm(cursor - 30), prayer: null, title: L("Get ready"), note: L("Breakfast at home, then pack the bag (see the list below).") + (prayers ? "" : " " + L("Check today's prayer times before you leave.")), place: null });

    const due = prayers ? (["dhuhr", "asr"] as const).map((k) => ({ k, at: toMin(prayers[k]), done: false })) : [];
    const pray = (ahead: number) => {
      for (const p of due) {
        if (p.done || p.at > cursor + ahead || p.at >= end) continue;
        const m = nearestOf(mosques, 5);
        const go = m ? travel(m.x) : 0;
        const start = p.at >= cursor + go ? p.at : up5(cursor + go);
        const note = L(m ? "At the nearest mosque on the way. Times are approximate: check with the mosque." : "Pray at a clean, quiet spot with your prayer mat. Times are approximate.") +
          (start > p.at + 10 ? " " + L("Its time starts at about {0}.", [hm(p.at)]) : "");
        steps.push({ time: hm(start), prayer: p.k, title: L(p.k === "dhuhr" ? "Dhuhr prayer" : "Asr prayer"), note, place: m ? mosqueCard(m.x, km(home, m.x)) : null });
        cursor = start + 20;
        if (m) here = m.x;
        p.done = true;
      }
    };
    const visit = (p: OutingRow | null) => {
      if (!p) return;
      pray(travel(p) + 15);
      const start = up5(cursor + travel(p));
      const room = end - 15 - start;
      const want = KIND_TEXT[p.kind].minutes;
      const fit = HOW_LONG.find(([m]) => m <= Math.min(want, room));
      if (!fit) return;
      const k = KIND_TEXT[p.kind];
      steps.push({ time: hm(start), prayer: null, title: L(k.title), note: [L(k.note), L(feeNote(p.fee)), L(fit[1])].join(" "), place: placeCard(p, km(home, p)) });
      if (p.fee === "yes") paid.yes = true;
      if (p.fee == null) paid.unknown = true;
      if (["pool", "water_park", "beach"].includes(p.kind)) paid.water = true;
      cursor = start + fit[0];
      here = p;
    };
    let lunched = false;
    const lunch = () => {
      lunched = true;
      pray(30);
      const fromHome = o.style === "simple" && o.budget === "low";
      const spot = !fromHome ? nearestOf(meals, 6, (f) => (o.style === "fancy" ? f.category === "restaurant" : true) && openOn(f.opening_hours, code) !== false && f.halal_status !== "likely")
        ?? nearestOf(meals, 6, (f) => (o.style === "fancy" ? f.category === "restaurant" : true) && openOn(f.opening_hours, code) !== false) : null;
      if (spot) {
        const start = up5(cursor + travel(spot.x));
        const minutes = o.style === "fancy" ? 75 : 60;
        steps.push({ time: hm(start), prayer: null, title: L(o.style === "fancy" ? "Lunch at a restaurant" : "Lunch"), note: [L(halalNote(spot.x.halal_status)), L("Check the menu prices before you go.")].join(" "), place: foodCard(spot.x, km(home, spot.x)) });
        paid.out = true;
        if (spot.x.halal_status === "likely") paid.likely = true;
        cursor = start + minutes;
        here = spot.x;
        return;
      }
      paid.home = true;
      // A packed lunch: at a park nearby when the weather allows, otherwise wherever eating is allowed.
      const herePark = here !== home && "kind" in here && PICNIC_OK.has((here as OutingRow).kind);
      const park = !bad && !herePark ? nearestOf(pool.filter((p) => PICNIC_OK.has(p.kind) && !used.has(p.key)), 1.5) : null;
      if (!bad && (herePark || park)) {
        paid.picnic = true;
        const start = park ? up5(cursor + travel(park.x)) : up5(cursor);
        steps.push({ time: hm(start), prayer: null, title: L("Picnic lunch"), note: L("Eat the lunch you packed from home."), place: park ? placeCard(park.x, km(home, park.x)) : null });
        if (park) { used.add(park.x.key); here = park.x; }
        cursor = start + 45;
      } else {
        paid.packed = true;
        const start = up5(cursor);
        steps.push({ time: hm(start), prayer: null, title: L("Lunch from home"), note: L("Eat the lunch you packed, where eating is allowed."), place: null });
        cursor = start + 45;
      }
    };

    for (const p of [a, bp]) {
      if (!lunched && cursor >= 11 * 60 + 40) lunch();
      visit(p);
    }
    if (!lunched && cursor <= 15 * 60) lunch();
    // The end of the afternoon: tea and dessert for a special day, otherwise somewhere light.
    const cafe = o.style === "fancy" ? nearestOf(meals, 5, (f) => f.category === "cafe" && openOn(f.opening_hours, code) !== false) : null;
    if (cafe && up5(cursor + travel(cafe.x)) + 45 <= end - 15) {
      pray(travel(cafe.x) + 15);
      const start = up5(cursor + travel(cafe.x));
      if (start + 45 <= end - 15) {
        steps.push({ time: hm(start), prayer: null, title: L("Tea and dessert"), note: [L(halalNote(cafe.x.halal_status)), L("Check the menu prices before you go.")].join(" "), place: foodCard(cafe.x, km(home, cafe.x)) });
        paid.out = true;
        if (cafe.x.halal_status === "likely") paid.likely = true;
        cursor = start + 45;
        here = cafe.x;
      }
    } else {
      visit(c);
    }
    // Any prayer still due before the end of the day, at its time.
    for (const p of due) if (!p.done && p.at < end) { cursor = Math.max(cursor, p.at - 15); pray(15); }
    if (maghrib != null && maghrib <= 19 * 60 + 30) {
      const m = nearestOf(mosques, 5);
      steps.push({
        time: hm(Math.max(maghrib, up5(cursor + (m ? travel(m.x) : 0)))), prayer: "maghrib", title: L("Maghrib prayer, then home"),
        note: L(m ? "At the nearest mosque on the way. Times are approximate: check with the mosque." : "Pray at home or on the way. Times are approximate."),
        place: m ? mosqueCard(m.x, km(home, m.x)) : null,
      });
    } else {
      steps.push({ time: hm(up5(cursor + 10)), prayer: null, title: L("Head home"), note: L("Time to head home and rest."), place: null });
    }
    const visits = steps.filter((s) => s.place && !["food", "mosque"].includes(String(s.place.kind)));
    const theme = visits.slice(0, 2).map((s) => s.title).join(" · ");
    return { day: key, date, weather: w, theme, steps };
  });

  if (planDays.some((d) => !d.steps.some((s) => s.place && !["food", "mosque"].includes(String(s.place.kind))))) {
    return { error: stillLoading ? "We're still gathering places near you. Try again in a few minutes." : "We couldn't find enough places near this location for a program." };
  }

  // Before you go, from what the program actually holds.
  const ws = planDays.map((d) => d.weather).filter(Boolean) as DayWeather[];
  const prepare = ["Prayer mat and a small bottle of water for wudu", "Water bottles for everyone"];
  if (o.who === "family") prepare.push("Snacks for the children");
  if (young) prepare.push("Stroller, nappies and wipes");
  if (paid.picnic) prepare.push("Packed lunch and a blanket to sit on");
  else if (paid.packed) prepare.push("Packed lunch in a cool bag");
  if (ws.some((w) => w.rain >= 40 || (w.code >= 51 && w.code < 71))) prepare.push("Umbrellas or rain jackets");
  if (ws.some((w) => w.min < 10)) prepare.push("Warm coats, hats and gloves");
  if (ws.some((w) => w.max >= 25 && w.code <= 2)) prepare.push("Sunscreen, hats and sunglasses");
  if (paid.water) prepare.push("Swimsuits and towels");
  if (paid.yes || paid.unknown) prepare.push("A card or some cash for tickets");
  if (paid.likely) prepare.push("Ask the restaurant if the food is halal before ordering");
  prepare.push("Comfortable walking shoes", "Plan the trip: car, bus or train", "Charged phone, and a look at the opening hours before leaving");

  const money: string[] = [];
  if (!paid.yes && !paid.unknown) money.push("Everything planned here is free or usually free.");
  if (paid.yes) money.push("Some places charge an entry fee: check the prices on their websites.");
  if (paid.unknown) money.push("Entry prices are unknown for some places: check before you go.");
  if (paid.out) money.push("Meals out cost money: check the menu prices.");
  else if (paid.home) money.push("Meals come from home, so food costs stay low.");
  money.push("Transport is extra.");

  // In Arabic, a place name written in Latin letters stays out of the title.
  const placeName = o.place && !(o.lang === "ar" && /[A-Za-z]/.test(o.place)) ? o.place : null;
  const title = placeName
    ? L(o.who === "family" ? "A family weekend in {0}" : o.who === "couple" ? "A weekend for two in {0}" : "Your weekend in {0}", [placeName])
    : L(o.who === "family" ? "A family weekend near you" : o.who === "couple" ? "A weekend for two near you" : "Your weekend nearby");

  return {
    plan: {
      title,
      place: o.place ?? null,
      days: planDays,
      prepare: prepare.map((s) => L(s)),
      money: money.map((s) => L(s)).join(" "),
      attribution: "Places © OpenStreetMap contributors · Weather: Open-Meteo",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const sync = url.searchParams.get("sync");
    if (sync) {
      const token = env("PLACES_SYNC_TOKEN");
      if (!token || req.headers.get("x-sync-token") !== token) return json({ error: "Not allowed." }, 403);
      if (sync === "pending") {
        const stale = new Date(Date.now() - REFRESH_MS).toISOString();
        const recent = new Date(Date.now() - 90 * 24 * 3600_000).toISOString();
        const tiles = await rest<Tile[]>(
          `outing_areas?select=tile,south,west,north,east&requested_at=gte.${encodeURIComponent(recent)}&or=(fetched_at.is.null,fetched_at.lt.${encodeURIComponent(stale)})&order=fetched_at.nullsfirst,requested_at.desc&limit=15`,
        );
        return json({ tiles: tiles.map((t) => ({ ...t, query: tileQuery(t) })) });
      }
      if (sync === "ingest" && req.method === "POST") {
        const body = (await req.json().catch(() => ({}))) as { tile?: Tile; elements?: OsmElement[] };
        if (!body.tile?.tile || !Array.isArray(body.elements)) return json({ error: "Send tile and elements." }, 400);
        return json({ stored: await ingestTile(body.tile, body.elements) });
      }
      if (sync === "seed" && req.method === "POST") {
        // The places library: the main cities of every country are fetched ahead of time,
        // for weekend outings and for the halal map alike.
        const body = (await req.json().catch(() => ({}))) as { cities?: { lat: number; lng: number; big?: boolean }[] };
        if (!Array.isArray(body.cities)) return json({ error: "Send cities." }, 400);
        const tiles = new Map<string, Tile>();
        for (const c of body.cities) {
          if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
          for (const t of tilesFor(c.lat, c.lng, c.big ? 12_000 : 1)) tiles.set(t.tile, t);
        }
        const now = new Date().toISOString();
        const rows = [...tiles.values()].map((t) => ({ ...t, requested_at: now }));
        for (let i = 0; i < rows.length; i += 500) {
          const part = JSON.stringify(rows.slice(i, i + 500));
          await rest("outing_areas?on_conflict=tile", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: part });
          await rest("place_areas?on_conflict=tile", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: part });
        }
        return json({ queued: rows.length });
      }
      return json({ error: "Unknown sync action." }, 400);
    }

    if (req.method !== "POST") return json({ error: "Use POST." }, 405);
    // The Firdam team can try a program with the admin token (it isn't saved).
    const adminToken = req.headers.get("x-lunchbox-token");
    const admin = !!adminToken && (await rest<boolean>("rpc/check_lunchbox_admin_token", { method: "POST", body: JSON.stringify({ p_token: adminToken }) })) === true;
    const user = admin ? null : await getUser(req);
    if (!admin && !user) return json({ error: "Please sign in." }, 401);
    if (user) {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const recent = await rest<{ id: string }[]>(`weekend_plans?select=id&user_id=eq.${user.id}&created_at=gte.${encodeURIComponent(since)}`);
      if (recent.length >= PLANS_PER_DAY) return json({ error: "You've made several programs today. Try again tomorrow." }, 429);
    }

    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const lat = Number(b.lat), lng = Number(b.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json({ error: "Choose where you live first." }, 400);
    const o: Options = {
      lat, lng,
      place: typeof b.place === "string" ? b.place.slice(0, 120) : undefined,
      who: b.who === "couple" || b.who === "family" ? b.who : "single",
      kids: Array.isArray(b.kids) ? b.kids.map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n < 19).slice(0, 10) : [],
      style: b.style === "fancy" ? "fancy" : "simple",
      budget: b.budget === "low" ? "low" : "normal",
      days: Array.isArray(b.days) ? (b.days.filter((d) => d === "sat" || d === "sun") as ("sat" | "sun")[]) : ["sat"],
      lang: b.lang === "fr" || b.lang === "ar" ? b.lang : "en",
    };
    const result = await makePlan(o);
    if ("error" in result) return json(result, 404);
    if (!user) return json({ id: null, plan: result.plan });
    const { lat: _a, lng: _b, ...kept } = o;
    const saved = await rest<{ id: string }[]>("weekend_plans", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: user.id, options: { ...kept, near: o.place ?? null }, plan: result.plan }),
    });
    return json({ id: saved[0]?.id ?? null, plan: result.plan });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
