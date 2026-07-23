import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface AladhanData {
  timings: Record<string, string>;
  date: {
    gregorian: { date: string; weekday: { en: string } };
    hijri: {
      day: string;
      month: { en: string };
      year: string;
      weekday: { en: string };
    };
  };
}

interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  name?: string;
  address?: NominatimAddress;
}

async function reverseGeocode(lat: string, lng: string): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`;
  const res = await fetch(url, { headers: { "User-Agent": "firdam-app" } });
  if (!res.ok) return null;
  const json = (await res.json()) as NominatimResponse;
  const addr = json.address;
  if (!addr) return json.name ?? null;
  const city = addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.county ?? json.name ?? null;
  const country = addr.country ?? null;
  if (city && country) return `${city}, ${country}`;
  return city ?? country ?? json.name ?? null;
}

function filterTimings(raw: Record<string, string>): PrayerTimings {
  return {
    Fajr: raw.Fajr ?? "",
    Sunrise: raw.Sunrise ?? "",
    Dhuhr: raw.Dhuhr ?? "",
    Asr: raw.Asr ?? "",
    Maghrib: raw.Maghrib ?? "",
    Isha: raw.Isha ?? "",
  };
}

function todayDatePath(): string {
  const d = new Date();
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    const q = url.searchParams.get("q"); // city search query
    const reverse = url.searchParams.get("reverse") === "1";

    // Reverse geocode: coordinates -> "City, Country"
    if (reverse && lat && lng) {
      const label = await reverseGeocode(lat, lng);
      return new Response(
        JSON.stringify({ label }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // City search via Open-Meteo geocoding
    if (q) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) {
        return new Response(
          JSON.stringify({ error: "City search failed." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const geoJson = (await geoRes.json()) as { results?: GeocodeResult[] };
      const places = (geoJson.results ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        country: r.country,
        region: r.admin1 ?? "",
        latitude: r.latitude,
        longitude: r.longitude,
        label: `${r.name}${r.admin1 ? `, ${r.admin1}` : ""}, ${r.country}`,
      }));
      return new Response(JSON.stringify({ places }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prayer times by coordinates
    if (lat && lng) {
      const datePath = todayDatePath();
      const apiUrl = `https://api.aladhan.com/v1/timings/${datePath}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&method=2`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `Upstream API error (${res.status})` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const json = (await res.json()) as { data: AladhanData };

      const payload = {
        timings: filterTimings(json.data.timings),
        gregorian: {
          date: json.data.date.gregorian.date,
          weekday: json.data.date.gregorian.weekday.en,
        },
        hijri: {
          day: json.data.date.hijri.day,
          month: json.data.date.hijri.month.en,
          year: json.data.date.hijri.year,
          weekday: json.data.date.hijri.weekday.en,
        },
      };

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Provide lat+lng or q query parameter." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
