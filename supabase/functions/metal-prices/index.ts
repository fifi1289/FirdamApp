import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Today's gold and silver price per gram, in the family's currency, for the
 * zakat calculator. GET or POST { currency: "CAD" }.
 *
 * Sources (free, no key): gold-api.com for spot gold (XAU) and silver (XAG)
 * in US dollars per troy ounce, and open.er-api.com for the exchange rate.
 * One fetch per currency per day, cached in public.metal_prices.
 * Spot prices: jewellers and banks sell a little higher.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const GRAMS_PER_TROY_OUNCE = 31.1034768;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
}

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

async function spotUsdPerOunce(symbol: "XAU" | "XAG"): Promise<number> {
  const res = await fetch(`https://api.gold-api.com/price/${symbol}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${symbol} price: ${res.status}`);
  const data = (await res.json()) as { price?: number };
  if (!data.price || !Number.isFinite(data.price)) throw new Error(`${symbol} price missing`);
  return data.price;
}

async function usdRate(currency: string): Promise<number> {
  if (currency === "USD") return 1;
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`exchange rate: ${res.status}`);
  const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
  const rate = data.rates?.[currency];
  if (!rate || !Number.isFinite(rate)) throw new Error(`no exchange rate for ${currency}`);
  return rate;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const fromQuery = new URL(req.url).searchParams.get("currency");
    const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as { currency?: string }) : {};
    const currency = (body.currency ?? fromQuery ?? "CAD").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return json({ error: "Unknown currency." }, 400);

    const day = new Date().toISOString().slice(0, 10);
    const url = env("SUPABASE_URL")!;
    const service = env("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };

    const cached = await fetch(`${url}/rest/v1/metal_prices?select=gold,silver,fetched_at&day=eq.${day}&currency=eq.${currency}`, { headers });
    const rows = cached.ok ? ((await cached.json()) as { gold: number; silver: number; fetched_at: string }[]) : [];
    if (rows[0]) return json({ currency, day, gold: Number(rows[0].gold), silver: Number(rows[0].silver), updated: rows[0].fetched_at, source: "gold-api.com" });

    const [xau, xag, rate] = await Promise.all([spotUsdPerOunce("XAU"), spotUsdPerOunce("XAG"), usdRate(currency)]);
    const gold = Math.round((xau / GRAMS_PER_TROY_OUNCE) * rate * 100) / 100;
    const silver = Math.round((xag / GRAMS_PER_TROY_OUNCE) * rate * 1000) / 1000;
    const fetched_at = new Date().toISOString();
    await fetch(`${url}/rest/v1/metal_prices`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ day, currency, gold, silver, fetched_at }),
    }).catch(() => undefined);
    return json({ currency, day, gold, silver, updated: fetched_at, source: "gold-api.com" });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
});
