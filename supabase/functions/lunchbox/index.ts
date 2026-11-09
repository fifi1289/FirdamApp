import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { describeOpenAIFailure, fetchOpenAI } from "../_shared/openai.ts";
import { countUsageThisMonth, getPlan, getUser, isAdminUser, recordUsage } from "../_shared/plan.ts";
import { generateFoodImage, imageModel, imageSlug, photoMatchesDish, uploadFoodImage } from "../_shared/recipe-image.ts";
import { ALWAYS_AVOID, lunchboxProblem, lunchboxRules, type LunchboxLike } from "../_shared/lunchbox-rules.ts";

/**
 * Lunchbox planner: a week (Monday–Friday) of school lunchboxes for the
 * children, 3 options a day for the child to choose from.
 *
 * POST { action: "plan", weekStart: "2026-11-09", children: [{ name, age, allergies }],
 *        allergies?: string[], leftovers?: [{ date, name, ingredients }] }
 *   Uses the shared library first (free, unlimited). Last night's dinner becomes
 *   a leftover option. Only when the library can't cover the week safely does
 *   the AI write new ideas (counted as "lunchbox_ai"); those that pass the
 *   checks join the library, so every family benefits and each picture is made once.
 *
 * Admin: POST { action: "images", limit?: 1–3 } makes pictures for ideas that have none;
 *        POST { action: "translate", limit?: 1–20 } adds French and Arabic text.
 *        Allowed for Firdam admins, or with header x-lunchbox-token (the Vault secret
 *        "lunchbox_admin_token", used by the daily database job "lunchbox-library").
 *
 * Every lunchbox passes lunchboxProblem(): never nuts, halal only, none of the
 * children's allergies, no choking hazards for under-4s, no sweets.
 */

const MODEL = "gpt-4o-mini";
const FREE_AI_PER_MONTH = 2;
const PAID_AI_PER_MONTH = 8;
const DAYS = 5;
const OPTIONS = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
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

interface Idea extends LunchboxLike {
  id: string;
  fun_tip: string;
  tools: string[];
  tags: string[];
  min_age: number;
  image_path: string | null;
  source: string;
  i18n: Record<string, unknown>;
}

interface Child {
  name: string;
  age: number | null;
  allergies: string[];
}

type Option =
  | { kind: "idea"; id: string }
  | { kind: "leftover"; dinner: string; name: string; items: string[]; fun_tip: string; tools: string[] };

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Last night's dinner as a lunchbox, if it's safe for these children. The
 * dinner's ingredients are checked too (a dish name alone can hide nuts).
 */
function leftoverOption(dinner: string, ingredients: string[], allergies: string[], youngest: number | null): Option | null {
  const name = dinner.trim().slice(0, 60);
  if (!name) return null;
  const box = {
    name: `Leftover ${name}`,
    items: [`${name} from last night (cold or at room temperature)`, "a wrap, rice or bread", "cucumber or carrot sticks", "a piece of fruit"],
    fun_tip: "Turn last night's dinner into a new lunch: roll it in a wrap and cut it into pinwheels.",
  };
  if (lunchboxProblem({ ...box, items: [...box.items, ...ingredients] }, allergies, youngest)) return null;
  return { kind: "leftover", dinner: name, ...box, tools: ["sandwich wrap paper", "bento lunch box"] };
}

/** Asks the AI for new lunchbox ideas and keeps only those that pass every check. */
async function aiIdeas(count: number, allergies: string[], youngest: number | null, avoidNames: string[]): Promise<(LunchboxLike & { tools: string[]; tags: string[] })[]> {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) throw new Error("AI is not set up.");
  const res = await fetchOpenAI(apiKey, {
    model: MODEL,
    temperature: 0.9,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: lunchboxRules(allergies, youngest) },
      {
        role: "user",
        content:
          `Write ${count} different school lunchbox ideas${youngest !== null ? ` for children aged ${youngest} and up` : ""}. ` +
          `Don't repeat these: ${avoidNames.slice(0, 60).join("; ")}. ` +
          `Answer as JSON: {"lunchboxes":[{"name":"playful name, max 40 characters","items":["4 to 6 items with simple amounts"],"fun_tip":"one sentence","tools":["1 to 3 reusable kitchen tools to make it, e.g. star cookie cutter, bento box, food picks"],"tags":["vegetarian" or "pescatarian" or "gluten-free", if true]}]}`,
      },
    ],
  });
  if (!res.ok) {
    const failure = await describeOpenAIFailure(res);
    throw new Error(failure.message);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  let parsed: { lunchboxes?: unknown[] } = {};
  try {
    parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  } catch {
    return [];
  }
  const out: (LunchboxLike & { tools: string[]; tags: string[] })[] = [];
  for (const raw of parsed.lunchboxes ?? []) {
    const o = raw as Record<string, unknown>;
    const box = {
      name: String(o.name ?? "").trim().slice(0, 80),
      items: (Array.isArray(o.items) ? o.items : []).map((x) => String(x).trim().slice(0, 140)).filter(Boolean).slice(0, 8),
      fun_tip: String(o.fun_tip ?? "").trim().slice(0, 280),
      tools: (Array.isArray(o.tools) ? o.tools : []).map((x) => String(x).trim().slice(0, 50)).filter(Boolean).slice(0, 3),
      tags: (Array.isArray(o.tags) ? o.tags : []).map((x) => String(x).toLowerCase()).filter((t) => ["vegetarian", "pescatarian", "gluten-free"].includes(t)),
    };
    if (box.name.length < 2 || box.items.length < 2 || !box.fun_tip) continue;
    const problem = lunchboxProblem(box, allergies, youngest);
    if (problem) {
      console.error(`AI lunchbox rejected (${problem}): ${box.name}`);
      continue;
    }
    out.push(box);
  }
  return out;
}

function lunchboxImagePrompt(idea: LunchboxLike): string {
  return [
    `Realistic overhead photograph of a child's school lunchbox called "${idea.name}": an open bento lunch box with compartments containing exactly:`,
    idea.items.join("; ") + ".",
    idea.fun_tip ? `Arranged in a fun, playful way for kids: ${idea.fun_tip}` : "",
    "Real food, neatly cut, bright natural colours, on a light wooden kitchen table with a small cloth napkin, soft daylight.",
    "Halal food only. Absolutely no nuts, no peanuts, no candy. No text, no logos, no people, no hands.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Makes and stores the picture for one idea (checked by a vision model). */
async function pictureFor(idea: Idea): Promise<string | null> {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) return null;
  const { model, quality } = imageModel();
  let reason = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = lunchboxImagePrompt(idea) + (reason ? ` IMPORTANT: the last picture was wrong (${reason}). Show exactly the food listed.` : "");
    const bytes = await generateFoodImage(apiKey, prompt, model, quality);
    let ok = true;
    try {
      const check = await photoMatchesDish(apiKey, bytes, `a kids' lunchbox with ${idea.items.join(", ")}`);
      ok = check.ok;
      reason = check.reason;
    } catch {
      ok = true;
    }
    if (ok) {
      const url = await uploadFoodImage(`lunchbox/${imageSlug(idea.name)}-${idea.id.slice(0, 8)}.webp`, bytes);
      await rest(`lunchbox_ideas?id=eq.${idea.id}`, { method: "PATCH", body: JSON.stringify({ image_path: url }) });
      return url;
    }
  }
  return null;
}

async function translateIdeas(ideas: Idea[]): Promise<number> {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey || !ideas.length) return 0;
  const res = await fetchOpenAI(apiKey, {
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Translate children's lunchbox ideas from English into natural French and Modern Standard Arabic for Muslim families. Keep amounts, keep 'halal', keep it short and warm. Answer JSON only.",
      },
      {
        role: "user",
        content:
          `Translate each: ${JSON.stringify(ideas.map((i) => ({ id: i.id, name: i.name, items: i.items, fun_tip: i.fun_tip, tools: i.tools })))}\n` +
          `Answer as {"items":[{"id":"...","fr":{"name":"","items":[],"fun_tip":"","tools":[]},"ar":{"name":"","items":[],"fun_tip":"","tools":[]}}]}`,
      },
    ],
  });
  if (!res.ok) throw new Error((await describeOpenAIFailure(res)).message);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { items?: { id: string; fr?: unknown; ar?: unknown }[] };
  let n = 0;
  for (const t of parsed.items ?? []) {
    const idea = ideas.find((i) => i.id === t.id);
    if (!idea || !t.fr || !t.ar) continue;
    await rest(`lunchbox_ideas?id=eq.${idea.id}`, { method: "PATCH", body: JSON.stringify({ i18n: { ...idea.i18n, fr: t.fr, ar: t.ar } }) });
    n++;
  }
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "plan");
    const token = req.headers.get("x-lunchbox-token");
    const user = token ? null : await getUser(req);

    if (action === "images" || action === "translate") {
      const allowed = token
        ? (await rest<boolean>("rpc/check_lunchbox_admin_token", { method: "POST", body: JSON.stringify({ p_token: token }) })) === true
        : !!user && (await isAdminUser(user.id));
      if (!allowed) return json({ error: "Admins only." }, 403);
      if (action === "images") {
        const limit = Math.min(3, Math.max(1, Number(body.limit) || 1));
        const todo = await rest<Idea[]>(`lunchbox_ideas?select=*&image_path=is.null&active=eq.true&order=created_at&limit=${limit}`);
        const made: string[] = [];
        for (const idea of todo) if (await pictureFor(idea)) made.push(idea.name);
        const left = await rest<{ id: string }[]>("lunchbox_ideas?select=id&image_path=is.null&active=eq.true");
        return json({ made, remaining: left.length });
      }
      const limit = Math.min(20, Math.max(1, Number(body.limit) || 10));
      const todo = await rest<Idea[]>(`lunchbox_ideas?select=*&active=eq.true&i18n->fr=is.null&order=created_at&limit=${limit}`);
      const done = await translateIdeas(todo);
      const left = await rest<{ id: string }[]>("lunchbox_ideas?select=id&active=eq.true&i18n->fr=is.null");
      return json({ translated: done, remaining: left.length });
    }

    // ---- plan
    if (!user) return json({ error: "Please sign in." }, 401);
    const weekStart = String(body.weekStart ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return json({ error: "Choose a week." }, 400);
    const children: Child[] = (Array.isArray(body.children) ? body.children : [])
      .slice(0, 8)
      .map((c) => {
        const o = c as Record<string, unknown>;
        const age = Number(o.age);
        return {
          name: String(o.name ?? "").trim().slice(0, 40),
          age: Number.isFinite(age) && age > 0 ? Math.floor(age) : null,
          allergies: (Array.isArray(o.allergies) ? o.allergies : []).map((a) => String(a).trim()).filter(Boolean).slice(0, 20),
        };
      });
    if (!children.length) return json({ error: "Choose at least one child." }, 400);
    if (children.some((c) => c.age !== null && c.age < 2)) {
      return json({ error: "Lunchboxes are for children aged 2 and up. Baby meals are coming soon." }, 400);
    }
    const household = (Array.isArray(body.allergies) ? body.allergies : []).map((a) => String(a).trim()).filter(Boolean);
    const allergies = [...new Set([...ALWAYS_AVOID, ...household, ...children.flatMap((c) => c.allergies)])];
    const ages = children.map((c) => c.age).filter((a): a is number => a !== null);
    const youngest = ages.length ? Math.min(...ages) : null;

    const library = await rest<Idea[]>("lunchbox_ideas?select=*&active=eq.true");
    let safe = library.filter((i) => (youngest === null || i.min_age <= Math.max(youngest, 3)) && !lunchboxProblem(i, allergies, youngest));

    // Not enough safe ideas for 3 a day: ask the AI for more (counted against the plan).
    let usedAI = false;
    let aiNote: string | null = null;
    const needed = DAYS * OPTIONS;
    if (safe.length < needed) {
      const plan = await getPlan(user.id);
      const limit = plan === "free" ? FREE_AI_PER_MONTH : PAID_AI_PER_MONTH;
      const used = await countUsageThisMonth(user.id, "lunchbox_ai");
      if (used < limit) {
        try {
          const fresh = await aiIdeas(Math.min(12, needed - safe.length + 4), allergies, youngest, library.map((i) => i.name));
          if (fresh.length) {
            const saved = await rest<Idea[]>("lunchbox_ideas?on_conflict=name", {
              method: "POST",
              headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
              body: JSON.stringify(fresh.map((f) => ({ ...f, min_age: Math.max(2, youngest ?? 3), source: "ai" }))),
            });
            safe = [...safe, ...saved];
            await recordUsage(user.id, "lunchbox_ai");
            usedAI = true;
            // Pictures for the new ideas, in the background (each is made once, then shared).
            // deno-lint-ignore no-explicit-any
            (globalThis as any).EdgeRuntime?.waitUntil?.(
              (async () => {
                for (const idea of saved.slice(0, 6)) await pictureFor(idea).catch((e) => console.error("lunchbox picture", e));
              })(),
            );
          }
        } catch (e) {
          aiNote = (e as Error).message;
        }
      } else {
        aiNote = "limit";
      }
    }
    if (!safe.length) return json({ error: "We couldn't find a lunchbox that fits these allergies yet. Try again later.", aiNote }, 422);

    // Three different options a day; spread ideas across the week before repeating.
    const pool = shuffle(safe);
    let cursor = 0;
    const next = (taken: Set<string>): Idea => {
      for (let tries = 0; tries < pool.length; tries++) {
        const idea = pool[cursor++ % pool.length];
        if (!taken.has(idea.id)) return idea;
      }
      return pool[cursor++ % pool.length];
    };
    const leftovers = (Array.isArray(body.leftovers) ? body.leftovers : []) as { date?: string; name?: string; ingredients?: unknown }[];
    const days = Array.from({ length: DAYS }, (_, d) => {
      const date = addDays(weekStart, d);
      const taken = new Set<string>();
      const options: Option[] = [];
      // Yesterday's dinner (from the meal plan) becomes the first option.
      const dinner = leftovers.find((l) => l.date === addDays(date, -1));
      const dinnerIngredients = (Array.isArray(dinner?.ingredients) ? dinner.ingredients : []).map((x) => String(x).slice(0, 80)).slice(0, 40);
      const left = dinner?.name ? leftoverOption(String(dinner.name), dinnerIngredients, allergies, youngest) : null;
      if (left) options.push(left);
      while (options.length < OPTIONS) {
        const idea = next(taken);
        taken.add(idea.id);
        options.push({ kind: "idea", id: idea.id });
      }
      return { date, options, chosen: null as number | null };
    });

    const ideasUsed = safe.filter((i) => days.some((d) => d.options.some((o) => o.kind === "idea" && o.id === i.id)));
    await rest("lunchbox_plans?on_conflict=user_id,week_start", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ user_id: user.id, week_start: weekStart, children, days, updated_at: new Date().toISOString() }),
    });
    return json({ weekStart, children, days, ideas: ideasUsed, usedAI, aiNote });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
