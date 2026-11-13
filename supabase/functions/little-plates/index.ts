import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { describeOpenAIFailure, fetchOpenAI } from "../_shared/openai.ts";
import { getUser } from "../_shared/plan.ts";

/**
 * Little Plates: how to make a baby or toddler version of one family meal.
 *
 * POST { key, name, ingredients: string[], steps: string[], stage: "baby" | "little" | "toddler" }
 * → { guide: { en, fr, ar }: { steps: string[], serve: string, portion: string } }
 *
 * Guides are written ahead of time for every library recipe and stage by the
 * scheduled "fill" action (header x-lunchbox-token), checked and saved in
 * little_plates. Families only read saved guides: opening a plate never starts
 * an AI call, so nobody can spend AI money by switching plates.
 *   POST { action: "fill", limit? } | { action: "status" }   (scheduled job)
 *
 * The fixed safety changes (no honey before 12 months, no added salt for babies, cut round foods,
 * no whole nuts…) are worked out in the app itself; this guide only adds the
 * steps, and is checked against the same rules before it is saved.
 */

const MODEL = "gpt-4o-mini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-lunchbox-token",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const env = (n: string) => {
  const v = Deno.env.get(n);
  return v && v.trim() ? v.trim() : undefined;
};

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Database error ${res.status}`);
  const t = await res.text();
  return (t ? JSON.parse(t) : null) as T;
}

const STAGES: Record<string, string> = {
  baby: "a baby aged 6 to 11 months: smooth purée or mash at first, then soft lumps and soft finger foods the size of an adult finger",
  little: "a little one aged 1 to 2 years: chopped family food in small soft pieces, very little salt, no chilli heat",
  toddler: "a toddler aged 2 to 4 years: family food cut small, with safety changes",
};

const RULES = `Safety rules that can never be broken:
- Never honey for under 12 months. Never added salt, stock cubes, soy sauce or salty cheese in a baby's portion: take the baby's portion out BEFORE salting or adding chilli.
- No whole or chopped nuts under 5 (finely ground nuts or smooth nut butter are fine). Cut grapes, cherry tomatoes, olives and blueberries into quarters lengthwise. Sausages in thin lengthwise strips, never coins.
- No added sugar for babies. Eggs cooked until firm. Remove bones and whole spices. No high-mercury fish.
- Halal food only: no pork, no alcohol in any form.
- Do not give medical advice, quantities of formula or breast milk, or ages for introducing allergens beyond "offer small amounts first".`;

/** The guide must not suggest anything the rules forbid. */
function guideProblem(text: string, stage: string): string | null {
  const t = text.toLowerCase();
  if (stage === "baby" && /\bhoney\b/.test(t) && !/\b(no|without|never|avoid|leave out|skip)\b[^.]{0,30}\bhoney\b/.test(t)) return "honey";
  if (stage === "baby" && /\b(add|sprinkle|season with)\b[^.]{0,20}\bsalt\b/.test(t)) return "salt";
  if (/\bwhole (nuts|peanuts|almonds|grapes)\b/.test(t) && !/\b(no|never|avoid|not)\b[^.]{0,20}\bwhole\b/.test(t)) return "whole nuts or grapes";
  if (/\b(pork|bacon|ham|wine|beer|rum|mirin)\b/.test(t)) return "not halal";
  return null;
}

interface Guide {
  steps: string[];
  serve: string;
  portion: string;
}

function cleanGuide(raw: unknown): Guide | null {
  const g = raw as Record<string, unknown> | null;
  if (!g) return null;
  const steps = (Array.isArray(g.steps) ? g.steps : []).map((s) => String(s).trim().slice(0, 240)).filter(Boolean).slice(0, 5);
  const serve = String(g.serve ?? "").trim().slice(0, 240);
  const portion = String(g.portion ?? "").trim().slice(0, 160);
  return steps.length >= 2 ? { steps, serve, portion } : null;
}

type GuideSet = Record<string, Guide>;

/** Writes and checks one guide (en, fr, ar), or null if it broke a rule twice. */
async function writeGuide(apiKey: string, stage: string, name: string, ingredients: string[], steps: string[]): Promise<GuideSet | null> {
  let reason = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchOpenAI(apiKey, {
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You help Muslim parents make a version of the family meal for ${STAGES[stage]}. Short, warm, practical steps a busy parent can follow while cooking the family meal. ${RULES}`,
        },
        {
          role: "user",
          content:
            `Family meal: ${name}\nIngredients: ${ingredients.join("; ")}\nFamily method: ${steps.join(" ")}\n` +
            (reason ? `Your last answer broke a rule (${reason}). Fix it.\n` : "") +
            `Write 3 to 4 steps: when to take the little one's portion out, how to change the texture, how to cut or shape it. Then how to serve it and a small portion size.\n` +
            `Answer as JSON with English, French and Modern Standard Arabic: {"en":{"steps":[],"serve":"","portion":""},"fr":{...},"ar":{...}}`,
        },
      ],
    });
    if (!res.ok) throw new Error((await describeOpenAIFailure(res)).message);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    } catch {
      continue;
    }
    const en = cleanGuide(parsed.en);
    if (!en) continue;
    const problem = guideProblem([...en.steps, en.serve, en.portion].join(" "), stage);
    if (problem) {
      reason = problem;
      continue;
    }
    const out: GuideSet = { en };
    const fr = cleanGuide(parsed.fr);
    const ar = cleanGuide(parsed.ar);
    if (fr) out.fr = fr;
    if (ar) out.ar = ar;
    return out;
  }
  return null;
}

interface Todo { id: string; name: string; stages: string[]; ingredients: string[]; steps: string[] }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const token = req.headers.get("x-lunchbox-token");

    // Scheduled job: write the guides still missing for library recipes.
    if (token) {
      const ok = (await rest<boolean>("rpc/check_lunchbox_admin_token", { method: "POST", body: JSON.stringify({ p_token: token }) })) === true;
      if (!ok) return json({ error: "Admins only." }, 403);
      if (body.action !== "fill") return json({ remaining: await rest<number>("rpc/little_plates_remaining", { method: "POST", body: "{}" }) });
      const apiKey = env("OPENAI_API_KEY");
      if (!apiKey) return json({ error: "AI is not set up." }, 503);
      const limit = Math.min(5, Math.max(1, Number(body.limit) || 3));
      const todo = await rest<Todo[]>("rpc/little_plates_todo", { method: "POST", body: JSON.stringify({ p_limit: limit }) });
      const jobs = todo.flatMap((r) => (r.stages ?? []).map((stage) => ({ r, stage })));
      let written = 0;
      const failed: string[] = [];
      await Promise.all(
        jobs.map(async ({ r, stage }) => {
          try {
            const guide = await writeGuide(apiKey, stage, r.name, (r.ingredients ?? []).slice(0, 40), (r.steps ?? []).map((x) => String(x).slice(0, 300)).slice(0, 15));
            if (!guide) return void failed.push(`${r.name} (${stage})`);
            await rest("little_plates?on_conflict=recipe_key,stage", {
              method: "POST",
              headers: { Prefer: "resolution=ignore-duplicates" },
              body: JSON.stringify({ recipe_key: r.id, stage, name: r.name, guide }),
            });
            written++;
          } catch (e) {
            failed.push(`${r.name} (${stage}): ${(e as Error).message}`);
          }
        }),
      );
      return json({ written, failed });
    }

    // Families: saved guides only, never a new AI call.
    const user = await getUser(req);
    if (!user) return json({ error: "Please sign in." }, 401);
    const key = String(body.key ?? "").trim().slice(0, 120);
    const stage = String(body.stage ?? "");
    if (!key || !STAGES[stage]) return json({ error: "Missing recipe or stage." }, 400);
    const saved = await rest<{ guide: unknown }[]>(`little_plates?select=guide&recipe_key=eq.${encodeURIComponent(key)}&stage=eq.${stage}`);
    if (saved[0]) return json({ guide: saved[0].guide, cached: true });
    return json({ error: "pending" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
