import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { photographRecipes } from "../_shared/recipe-image.ts";

/**
 * Photos for recipes written by hand for the library (desserts, picnic food…):
 *   POST { ids: string[] } with the admin token (x-lunchbox-token)
 * Makes a checked photo for each one without a photo, then shows the ones that
 * have their photo (a recipe is never shown before its photo exists).
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const env = (n: string) => Deno.env.get(n)?.trim() || undefined;

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = env("SUPABASE_URL")!, key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`Database ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Use POST." }, 405);
    const token = req.headers.get("x-lunchbox-token");
    const ok = !!token && (await rest<boolean>("rpc/check_lunchbox_admin_token", { method: "POST", body: JSON.stringify({ p_token: token }) })) === true;
    if (!ok) return json({ error: "Not allowed." }, 403);
    const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
    const ids = (Array.isArray(body.ids) ? body.ids : []).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 30);
    if (!ids.length) return json({ error: "Send ids." }, 400);
    await photographRecipes(ids, 130_000);
    const shown = await rest<{ id: string }[]>(`recipes?id=in.(${ids.join(",")})&image_path=not.is.null&is_active=eq.false`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ is_active: true, source: "firdam" }),
    });
    const left = await rest<{ id: string }[]>(`recipes?select=id&id=in.(${ids.join(",")})&image_path=is.null`);
    return json({ shown: shown.length, waiting: left.length });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
