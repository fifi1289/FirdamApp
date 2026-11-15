import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Re-translates the French and Arabic name and description of recipes whose
 * English name changed (e.g. moved to the International cuisine).
 *   POST { ids: string[] }   header x-lunchbox-token (Vault "lunchbox_admin_token")
 */
const env = (n: string) => Deno.env.get(n)?.trim();
const URL_ = env("SUPABASE_URL")!, KEY = env("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`Database ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const t = await res.text();
  return (t ? JSON.parse(t) : null) as T;
}

const LANG = { fr: "French", ar: "Modern Standard Arabic, in Arabic script only" } as const;

async function translate(name: string, description: string, lang: "fr" | "ar") {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("OPENAI_API_KEY")}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Translate this halal recipe's name and one-line description from English into ${LANG[lang]} for a family cooking app. Translate faithfully; do not add any country or cuisine that is not in the English. Return JSON {"name": string, "description": string}.`,
        },
        { role: "user", content: JSON.stringify({ name, description }) },
      ],
    }),
  });
  if (!res.ok) return null;
  const o = JSON.parse(((await res.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "{}") as { name?: string; description?: string };
  const n = (o.name ?? "").trim();
  if (!n || (lang === "ar" && (/[A-Za-z]/.test(n) || !/[؀-ۿ]/.test(n)))) return null;
  return { name: n.slice(0, 200), description: (o.description ?? "").trim().slice(0, 400) || null };
}

Deno.serve(async (req) => {
  try {
    const token = req.headers.get("x-lunchbox-token");
    const ok = token && (await rest<boolean>("rpc/check_lunchbox_admin_token", { method: "POST", body: JSON.stringify({ p_token: token }) })) === true;
    if (!ok) return new Response(JSON.stringify({ error: "Admins only." }), { status: 403 });
    const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
    const ids = (body.ids ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 60);
    if (!ids.length) return new Response(JSON.stringify({ done: 0 }));
    const rows = await rest<{ id: string; name: string; short_description: string | null }[]>(`recipes?select=id,name,short_description&id=in.(${ids.join(",")})`);
    let done = 0;
    const failed: string[] = [];
    await Promise.all(
      rows.flatMap((r) =>
        (["fr", "ar"] as const).map(async (lang) => {
          const t = await translate(r.name, r.short_description ?? "", lang).catch(() => null);
          if (!t) return void failed.push(`${r.name} (${lang})`);
          await rest(`recipe_translations?recipe_id=eq.${r.id}&lang=eq.${lang}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name: t.name, short_description: t.description }) });
          done++;
        }),
      ),
    );
    return new Response(JSON.stringify({ done, failed }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
