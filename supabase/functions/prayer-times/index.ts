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

interface AladhanResponse {
  data: {
    timings: Record<string, string>;
    date: {
      readable: string;
      gregorian: { date: string; weekday: { en: string } };
      hijri: {
        date: string;
        day: string;
        month: { en: string };
        year: string;
        weekday: { en: string };
      };
    };
  };
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    const city = url.searchParams.get("city");

    let apiUrl: string;
    if (lat && lng) {
      apiUrl = `https://api.aladhan.com/v1/timings?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&method=2`;
    } else if (city) {
      apiUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&method=2`;
    } else {
      return new Response(
        JSON.stringify({ error: "Provide lat+lng or city query parameter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(apiUrl);
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream API error (${res.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const json = (await res.json()) as AladhanResponse;

    const payload = {
      timings: filterTimings(json.data.timings),
      gregorian: {
        date: json.data.date.gregorian.date,
        weekday: json.data.date.gregorian.weekday.en,
      },
      hijri: {
        date: json.data.date.hijri.date,
        day: json.data.date.hijri.day,
        month: json.data.date.hijri.month.en,
        year: json.data.date.hijri.year,
        weekday: json.data.date.hijri.weekday.en,
      },
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
