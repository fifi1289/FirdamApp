import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUser, isAdminUser } from "../_shared/plan.ts";

/**
 * Admin tool: generates a photo for library recipes that don't have one,
 * stores it in the public `recipe-images` bucket and sets recipes.image_path.
 *
 *   GET  → progress { total, withPhoto, remaining, model, quality, costPerImage }
 *   POST { limit?: 1–3, recipeId?: string, redo?: boolean } → photos made in this call
 *
 * The admin page calls POST repeatedly (a few photos per call keeps each call
 * well inside the edge-function time limit).
 *
 * Secrets: OPENAI_API_KEY. Optional: IMAGE_MODEL (default gpt-image-1-mini),
 * IMAGE_QUALITY (low | medium | high, default medium).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const BUCKET = "recipe-images";
const SIZE = "1536x1024";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

/** Approximate USD per 1536×1024 image (1024×1024 price × 1.5), for the progress screen. */
const PRICES: Record<string, Record<string, number>> = {
  "gpt-image-1-mini": { low: 0.008, medium: 0.017, high: 0.054 },
  "gpt-image-1.5": { low: 0.014, medium: 0.051, high: 0.2 },
  "gpt-image-1": { low: 0.017, medium: 0.063, high: 0.25 },
};

interface RecipeRow {
  id: string;
  name: string;
  short_description: string | null;
  image_prompt: string | null;
  cuisine: { name: string } | null;
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = env("SUPABASE_URL")!;
  const key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Database error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function count(filter: string): Promise<number> {
  const url = env("SUPABASE_URL")!;
  const key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/recipes?select=id&is_active=eq.true${filter}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const range = res.headers.get("content-range") ?? "";
  return Number(range.split("/")[1] ?? 0) || 0;
}

function buildPrompt(r: { name: string; cuisine?: string | null; details?: string | null }): string {
  return [
    `Professional overhead-angle food photograph of ${r.name}${r.cuisine ? `, a ${r.cuisine} dish` : ""}, freshly made at home.`,
    r.details ? `The dish: ${r.details}` : "",
    "Served in a handmade ceramic dish on a warm walnut wooden table with a soft linen napkin;",
    "warm natural window light, soft shadows, shallow depth of field, rich appetising colours, realistic textures,",
    "earthy warm palette of walnut brown, soft linen beige, sage green and muted gold.",
    "Halal food only: no pork, no wine or alcohol in the scene.",
    "No text, no logos, no watermark, no people, no hands.",
  ]
    .filter(Boolean)
    .join(" ");
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function generate(apiKey: string, prompt: string, model: string, quality: string): Promise<Uint8Array> {
  const body: Record<string, unknown> = { model, prompt, size: SIZE, quality, n: 1 };
  // gpt-image models can return compressed WebP directly (much smaller files).
  body.output_format = "webp";
  body.output_compression = 82;
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`OpenAI images ${res.status}: ${text.slice(0, 500)}`);
    const err = new Error(
      res.status === 429 && /quota|billing/i.test(text)
        ? "The OpenAI account is out of credit."
        : res.status === 429
          ? "OpenAI rate limit — waiting a moment."
          : res.status === 400 && /safety|moderation/i.test(text)
            ? "OpenAI declined this prompt."
            : `OpenAI error ${res.status}.`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image.");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function upload(path: string, bytes: Uint8Array): Promise<string> {
  const url = env("SUPABASE_URL")!;
  const key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "image/webp", "x-upsert": "true", "Cache-Control": "31536000" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Upload failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user || !(await isAdminUser(user.id))) return json({ error: "Admins only." }, 403);

    const model = env("IMAGE_MODEL") ?? "gpt-image-1-mini";
    const quality = env("IMAGE_QUALITY") ?? "medium";
    const costPerImage = PRICES[model]?.[quality] ?? null;

    if (req.method === "GET") {
      const [total, missing] = await Promise.all([count(""), count("&image_path=is.null")]);
      return json({ total, withPhoto: total - missing, remaining: missing, model, quality, costPerImage, configured: !!env("OPENAI_API_KEY") });
    }
    if (req.method !== "POST") return json({ error: "Use GET or POST." }, 405);

    const apiKey = env("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "Add OPENAI_API_KEY to the Supabase function secrets first.", code: "not_configured" }, 501);

    const body = (await req.json().catch(() => ({}))) as { limit?: number; recipeId?: string; redo?: boolean; skip?: string[] };
    const skip = (Array.isArray(body.skip) ? body.skip : []).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
    const skipFilter = skip.length ? `&id=not.in.(${skip.join(",")})` : "";
    const limit = Math.min(Math.max(Number(body.limit) || 2, 1), 3);
    const select = "select=id,name,short_description,image_prompt,cuisine:cuisines(name)";
    const rows = body.recipeId
      ? await rest<RecipeRow[]>(`recipes?${select}&id=eq.${encodeURIComponent(body.recipeId)}${body.redo ? "" : "&image_path=is.null"}`)
      : await rest<RecipeRow[]>(`recipes?${select}&is_active=eq.true&image_path=is.null${skipFilter}&order=name&limit=${limit}`);

    const done: { id: string; name: string; url: string }[] = [];
    const failed: { id: string; name: string; error: string }[] = [];
    for (const r of rows) {
      try {
        const prompt = buildPrompt({ name: r.name, cuisine: r.cuisine?.name, details: r.image_prompt ?? r.short_description });
        const bytes = await generate(apiKey, prompt, model, quality);
        const path = `${slugify(r.name)}-${r.id.slice(0, 8)}-${Date.now().toString(36)}.webp`;
        const url = await upload(path, bytes);
        await rest(`recipes?id=eq.${r.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ image_path: url }) });
        done.push({ id: r.id, name: r.name, url });
      } catch (err) {
        const e = err as Error & { status?: number };
        failed.push({ id: r.id, name: r.name, error: e.message });
        // Stop this round on account-level problems; the page shows the message.
        if (e.status === 429 || e.status === 401) break;
      }
    }
    const remaining = await count("&image_path=is.null");
    return json({ done, failed, remaining, costPerImage });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
