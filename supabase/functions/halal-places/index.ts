import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Halal Places — OpenStreetMap lookup.
 *
 *   GET ?lat=..&lng=..&radius=5000   halal shops, restaurants and mosques nearby
 *   GET ?q=Ottawa                    city / place search (for the location picker)
 *   GET ?address=123 Bank St Ottawa  address geocoding (for "Add a place")
 *
 * Data comes from the public Overpass and Nominatim APIs. Results are cached
 * in memory for a short time so repeated searches don't hammer them.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const USER_AGENT = "Firdam/1.0 (https://firdam.app)";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

type Category = "grocery" | "butcher" | "restaurant" | "cafe" | "mosque" | "other";

interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface NormalizedPlace {
  key: string;
  source: "osm";
  name: string;
  category: Category;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  halalStatus: "halal" | "halal_only" | "halal_options" | "mosque";
  certification: string | null;
  cuisine: string | null;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; body: unknown }>();

function cached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.body as T;
}

function remember(key: string, body: unknown) {
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), body });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const GROCERY_SHOPS = new Set([
  "supermarket",
  "convenience",
  "grocery",
  "greengrocer",
  "deli",
  "general",
  "food",
  "frozen_food",
  "spices",
  "health_food",
]);

function categorize(tags: Record<string, string>): Category {
  if (tags.amenity === "place_of_worship") return "mosque";
  if (tags.shop === "butcher") return "butcher";
  if (tags.shop && GROCERY_SHOPS.has(tags.shop)) return "grocery";
  if (["restaurant", "fast_food", "food_court"].includes(tags.amenity ?? "")) return "restaurant";
  if (tags.amenity === "cafe" || ["bakery", "pastry", "confectionery"].includes(tags.shop ?? "")) {
    return "cafe";
  }
  return "other";
}

function buildAddress(tags: Record<string, string>): string | null {
  if (tags["addr:full"]) return tags["addr:full"];
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [street, tags["addr:city"] ?? tags["addr:suburb"], tags["addr:postcode"]].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : null;
}

function normalize(el: OsmElement): NormalizedPlace | null {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat === undefined || lon === undefined) return null;

  const category = categorize(tags);
  const name = tags.name ?? tags["name:en"] ?? tags.brand ?? null;
  if (!name) return null;

  const dietHalal = (tags["diet:halal"] ?? tags.halal ?? "").toLowerCase();
  let halalStatus: NormalizedPlace["halalStatus"];
  if (category === "mosque") halalStatus = "mosque";
  else if (dietHalal === "only") halalStatus = "halal_only";
  else if (dietHalal === "limited") halalStatus = "halal_options";
  else halalStatus = "halal";

  return {
    key: `osm:${el.type}/${el.id}`,
    source: "osm",
    name,
    category,
    latitude: lat,
    longitude: lon,
    address: buildAddress(tags),
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
    openingHours: tags.opening_hours ?? null,
    halalStatus,
    certification: tags["diet:halal:certification"] ?? tags["halal:certification"] ?? null,
    cuisine: tags.cuisine ? tags.cuisine.replace(/;/g, ", ").replace(/_/g, " ") : null,
  };
}

async function queryOverpass(lat: number, lng: number, radius: number): Promise<OsmElement[]> {
  const around = `(around:${radius},${lat},${lng})`;
  const query = `
    [out:json][timeout:25];
    (
      nwr["diet:halal"~"^(yes|only|limited)$"]${around};
      nwr["halal"="yes"]${around};
      nwr["amenity"="place_of_worship"]["religion"="muslim"]${around};
    );
    out center tags 400;
  `;

  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(28_000),
      });
      if (!res.ok) {
        lastError = new Error(`Overpass ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { elements?: OsmElement[] };
      return data.elements ?? [];
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("Overpass unavailable");
}

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

async function searchCities(q: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("City search failed");
  const data = (await res.json()) as { results?: GeoResult[] };
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country,
    region: r.admin1 ?? "",
    latitude: r.latitude,
    longitude: r.longitude,
    label: `${r.name}${r.admin1 ? `, ${r.admin1}` : ""}, ${r.country}`,
  }));
}

interface NominatimSearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: { city?: string; town?: string; village?: string; country?: string };
}

async function geocodeAddress(address: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Address search failed");
  const data = (await res.json()) as NominatimSearchResult[];
  return data.map((r) => ({
    id: r.place_id,
    label: r.display_name,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
    city: r.address?.city ?? r.address?.town ?? r.address?.village ?? null,
    country: r.address?.country ?? null,
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const address = url.searchParams.get("address")?.trim();
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const radius = Math.min(Math.max(Number(url.searchParams.get("radius")) || 5000, 500), 30000);

    if (q) {
      if (q.length < 2) return json({ places: [] });
      const key = `q:${q.toLowerCase()}`;
      const hit = cached<unknown>(key);
      if (hit) return json(hit);
      const body = { places: await searchCities(q) };
      remember(key, body);
      return json(body);
    }

    if (address) {
      if (address.length < 4) return json({ results: [] });
      const key = `a:${address.toLowerCase()}`;
      const hit = cached<unknown>(key);
      if (hit) return json(hit);
      const body = { results: await geocodeAddress(address) };
      remember(key, body);
      return json(body);
    }

    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      // Round so nearby searches share a cache entry (~1 km grid).
      const key = `p:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`;
      const hit = cached<unknown>(key);
      if (hit) return json(hit);

      const elements = await queryOverpass(lat, lng, radius);
      const seen = new Set<string>();
      const places: NormalizedPlace[] = [];
      for (const el of elements) {
        const place = normalize(el);
        if (!place || seen.has(place.key)) continue;
        seen.add(place.key);
        places.push(place);
      }
      const body = { places, attribution: "© OpenStreetMap contributors" };
      remember(key, body);
      return json(body);
    }

    return json({ error: "Provide lat+lng, q, or address." }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 502);
  }
});
