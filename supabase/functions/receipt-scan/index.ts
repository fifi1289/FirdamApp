import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { haramItemReason } from "../_shared/halal.ts";
import { describeOpenAIFailure, fetchOpenAI } from "../_shared/openai.ts";
import { countUsageThisMonth, getPlan, getUser, PAID_RECEIPT_SCANS_PER_MONTH, recordUsage } from "../_shared/plan.ts";

/**
 * Reads a shopping receipt photo and returns the food items on it, ready for
 * the family to check before they go into the pantry. Paid plans only.
 *
 * POST { image: "data:image/jpeg;base64,…" }
 * → { items: [{ name, quantity, unit, category, staple }], store, date, total, currency, used, limit }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const MODEL = "gpt-4o-mini";
const MAX_IMAGE_CHARS = 6_000_000; // ~4.5 MB of base64

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const CATEGORIES = [
  "Fruits", "Vegetables", "Meat", "Poultry", "Seafood", "Dairy", "Eggs", "Grains", "Pasta & Rice", "Canned Foods",
  "Frozen Foods", "Bakery", "Snacks", "Beverages", "Spices", "Oils & Condiments", "Other",
];
const UNITS = ["Pieces", "g", "kg", "ml", "L", "Pack", "Bottle", "Can", "Box"];

const PROMPT = `You read grocery receipts for a Muslim family's pantry app.
Return ONLY JSON: {"store": string|null, "date": "YYYY-MM-DD"|null, "total": number|null, "currency": string|null, "items": [...]}
Each item: {"name": string, "quantity": number, "unit": one of ${JSON.stringify(UNITS)}, "category": one of ${JSON.stringify(CATEGORIES)}, "staple": boolean}
Rules:
- Only food and drink. Skip bags, cleaning products, toiletries, deposits, discounts, loyalty lines, totals and payment lines.
- "name": a short, plain English shopping-list name ("Chicken thighs", "Basmati rice", "Whole milk", "Tomatoes"), not the receipt's abbreviation or brand code. Expand abbreviations ("CHKN THGH" → "Chicken thighs").
- Quantity and unit from the line: weights (0.82 kg → 0.82 kg), sizes in the name (2L milk → 2 L; 500G → 500 g; 6PK / x6 → 6 Pieces), multiples (2 @ 1.99 → quantity 2). If unknown, quantity 1 and unit "Pack" (or "Pieces" for single fruit/veg items).
- Merge identical lines.
- "staple": true for long-lasting cupboard basics tracked by level (rice, flour, sugar, oil, ghee, lentils, pasta, couscous, bulgur, oats, tea, coffee, spices, salt, honey, tahini, tomato paste).
- If the image is not a receipt or is unreadable, return {"items": [], "store": null, "date": null, "total": null, "currency": null}.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "Receipt scanning isn't set up yet.", code: "not_configured" }, 501);

    const user = await getUser(req);
    if (!user) return json({ error: "Please sign in." }, 401);
    const plan = await getPlan(user.id);
    if (plan === "free") {
      return json({ error: "Receipt scanning is part of Premium and Family+.", code: "limit_reached" }, 402);
    }
    const used = await countUsageThisMonth(user.id, "receipt_scan");
    if (used >= PAID_RECEIPT_SCANS_PER_MONTH) {
      return json(
        { error: `You've scanned ${PAID_RECEIPT_SCANS_PER_MONTH} receipts this month — the monthly maximum. Quick add still works.`, code: "fair_use" },
        429,
      );
    }

    const body = (await req.json().catch(() => ({}))) as { image?: string };
    const image = typeof body.image === "string" ? body.image : "";
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(image)) return json({ error: "Send a JPEG, PNG or WebP photo." }, 400);
    if (image.length > MAX_IMAGE_CHARS) return json({ error: "That photo is too large. Try again a little further away." }, 413);

    const res = await fetchOpenAI(apiKey, {
      model: MODEL,
      temperature: 0,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this receipt." },
            { type: "image_url", image_url: { url: image, detail: "high" } },
          ],
        },
      ],
    });
    if (!res.ok) {
      const fail = await describeOpenAIFailure(res);
      return json({ error: fail.message, code: fail.code }, fail.status);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }
    const rawItems = Array.isArray(parsed.items) ? (parsed.items as Record<string, unknown>[]) : [];
    const items = rawItems
      .map((i) => {
        const name = typeof i.name === "string" ? i.name.trim().slice(0, 80) : "";
        const quantity = typeof i.quantity === "number" && i.quantity > 0 && i.quantity < 10000 ? i.quantity : 1;
        const unit = UNITS.includes(String(i.unit)) ? String(i.unit) : "Pack";
        const category = CATEGORIES.includes(String(i.category)) ? String(i.category) : "Other";
        return { name, quantity, unit, category, staple: i.staple === true };
      })
      .filter((i) => i.name)
      .slice(0, 80);
    // Halal only: haram lines on a receipt are not offered for the pantry.
    const skipped = items.filter((i) => haramItemReason(i.name)).map((i) => ({ name: i.name, reason: haramItemReason(i.name) }));
    const halalItems = items.filter((i) => !haramItemReason(i.name));

    // Count the scan once the receipt was read (a failed OpenAI call doesn't count).
    await recordUsage(user.id, "receipt_scan");

    const total = typeof parsed.total === "number" && parsed.total > 0 ? Math.round(parsed.total * 100) / 100 : null;
    const date = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null;
    return json({
      items: halalItems,
      skipped,
      store: typeof parsed.store === "string" ? parsed.store.slice(0, 80) : null,
      date,
      total,
      currency: typeof parsed.currency === "string" ? parsed.currency.slice(0, 8) : null,
      used: used + 1,
      limit: PAID_RECEIPT_SCANS_PER_MONTH,
    });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
