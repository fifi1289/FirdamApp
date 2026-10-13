/**
 * AI food photos for recipes: one prompt style for the whole library, stored in
 * the public `recipe-images` bucket and saved on recipes.image_path.
 *
 * Secrets: OPENAI_API_KEY. Optional: IMAGE_MODEL (default gpt-image-1-mini),
 * IMAGE_QUALITY (low | medium | high, default medium).
 */

const IMAGE_BUCKET = "recipe-images";
const IMAGE_SIZE = "1536x1024";

function secret(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

export function imageModel(): { model: string; quality: string } {
  return { model: secret("IMAGE_MODEL") ?? "gpt-image-1-mini", quality: secret("IMAGE_QUALITY") ?? "medium" };
}

export function buildImagePrompt(r: { name: string; cuisine?: string | null; details?: string | null }): string {
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

export function imageSlug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export async function generateFoodImage(apiKey: string, prompt: string, model: string, quality: string): Promise<ArrayBuffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    // gpt-image models can return compressed WebP directly (much smaller files).
    body: JSON.stringify({ model, prompt, size: IMAGE_SIZE, quality, n: 1, output_format: "webp", output_compression: 82 }),
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
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer as ArrayBuffer;
}

export async function uploadFoodImage(path: string, bytes: ArrayBuffer): Promise<string> {
  const url = secret("SUPABASE_URL")!;
  const key = secret("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/storage/v1/object/${IMAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "image/webp", "x-upsert": "true", "Cache-Control": "31536000" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Upload failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return `${url}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

/**
 * Makes a photo for each recipe that has none yet, one at a time, until the
 * time budget runs out. Recipes left over are picked up by the admin
 * "Recipe images" tool or the next plan that uses them.
 */
export async function photographRecipes(ids: string[], budgetMs = 120_000): Promise<void> {
  const apiKey = secret("OPENAI_API_KEY");
  const url = secret("SUPABASE_URL");
  const key = secret("SUPABASE_SERVICE_ROLE_KEY");
  const unique = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!apiKey || !url || !key || !unique.length) return;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const res = await fetch(
    `${url}/rest/v1/recipes?select=id,name,short_description,image_prompt,cuisine:cuisines(name)&image_path=is.null&id=in.(${unique.join(",")})`,
    { headers },
  );
  if (!res.ok) return;
  const rows = (await res.json()) as { id: string; name: string; short_description: string | null; image_prompt: string | null; cuisine: { name: string } | null }[];
  const { model, quality } = imageModel();
  const stopAt = Date.now() + budgetMs;
  for (const r of rows) {
    if (Date.now() > stopAt) break;
    try {
      const prompt = buildImagePrompt({ name: r.name, cuisine: r.cuisine?.name, details: r.image_prompt ?? r.short_description });
      const bytes = await generateFoodImage(apiKey, prompt, model, quality);
      const path = `${imageSlug(r.name)}-${r.id.slice(0, 8)}-${Date.now().toString(36)}.webp`;
      const image = await uploadFoodImage(path, bytes);
      await fetch(`${url}/rest/v1/recipes?id=eq.${r.id}&image_path=is.null`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ image_path: image }),
      });
    } catch (err) {
      const e = err as Error & { status?: number };
      console.error(`Recipe photo for ${r.name}: ${e.message}`);
      if (e.status === 429 || e.status === 401) break;
    }
  }
}
