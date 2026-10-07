import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { describeOpenAIFailure, fetchOpenAI } from "../_shared/openai.ts";
import { checkNeeds, deductionsFor, type PantryLike } from "../_shared/pantry-engine.ts";
import { formatAmount, matchScore, toBase, toUnit } from "../_shared/pantry-units.ts";
import { householdFrom } from "../_shared/pantry-portions.ts";
import {
  countUsageThisMonth,
  countUsageToday,
  getPlan,
  getUser,
  recordUsage,
  FREE_COMPANION_MESSAGES_PER_MONTH,
  PAID_COMPANION_MESSAGES_PER_DAY,
} from "../_shared/plan.ts";

/**
 * Firdam AI Family Companion.
 *
 * POST {
 *   messages: { role: "user" | "assistant", content: string }[],
 *   today: "YYYY-MM-DD", timezone: "America/Toronto",
 *   prayerTimes?: Record<string, string>, location?: string
 * }
 * → { reply: string, actions: { type: string, summary: string }[] }
 *
 * The function reads the signed-in user's own data (with the service role,
 * always filtered by their user id) to give grounded answers, and can take
 * a few safe actions on their behalf via tool calls.
 *
 * Secrets: OPENAI_API_KEY (SUPABASE_URL / SERVICE_ROLE_KEY are provided).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL = "gpt-4o-mini";
const MAX_HISTORY = 10;
const MAX_TOOL_ROUNDS = 3;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

// ── Data access (service role, always scoped to the user) ───────────────
async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase credentials missing");
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Data error ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Reads a table for this user; returns [] if the table is missing or errors. */
/**
 * Rows the user can see. For shared household tables, pass the household id
 * so items other family members added are included too.
 */
async function mine<T>(table: string, userId: string, query = "", householdId?: string | null): Promise<T[]> {
  const who = householdId
    ? `or=(user_id.eq.${encodeURIComponent(userId)},household_id.eq.${encodeURIComponent(householdId)})`
    : `user_id=eq.${encodeURIComponent(userId)}`;
  try {
    return await rest<T[]>(`${table}?${who}${query ? `&${query}` : ""}`);
  } catch {
    return [];
  }
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

interface Ctx {
  userId: string;
  today: string;
  /** Shared household (Family+), so new items are visible to the whole family. */
  householdId?: string | null;
}

async function buildContext(ctx: Ctx, extras: { prayerTimes?: Record<string, string>; location?: string; timezone?: string }) {
  const { userId, today } = ctx;
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);
  const monthStart = `${today.slice(0, 7)}-01`;
  const hh = ctx.householdId ?? null;

  const [profile, members, tasks, events, plans, pantry, groceries, categories, spend, goals, quran] = await Promise.all([
    rest<{ first_name: string | null }[]>(`profiles?id=eq.${userId}&select=first_name`).catch(() => []),
    mine<{ first_name: string; relationship: string; birth_date: string | null }>(
      "family_members",
      userId,
      "select=first_name,relationship,birth_date",
      hh,
    ),
    mine<{ title: string; scheduled_date: string; time: string | null; completed: boolean; priority: string }>(
      "planner_tasks",
      userId,
      `select=title,scheduled_date,time,completed,priority&scheduled_date=gte.${today}&scheduled_date=lte.${in7}&order=scheduled_date`,
      hh,
    ),
    mine<{ title: string; kind: string; starts_on: string; start_time: string | null; repeats_yearly: boolean }>(
      "family_events",
      userId,
      "select=title,kind,starts_on,start_time,repeats_yearly",
      hh,
    ),
    mine<{ plan_data: { weekStartDate?: string; days?: { date: string; meals: { type: string; name: string }[] }[] } }>(
      "meal_plans",
      userId,
      "select=plan_data&order=created_at.desc&limit=3",
      hh,
    ),
    mine<{ name: string; quantity: number; unit: string; expiration_date: string | null; tracking: string | null; level: string | null }>(
      "pantry_items",
      userId,
      "select=name,quantity,unit,expiration_date,tracking,level",
      hh,
    ),
    mine<{ name: string; quantity: number | null; unit: string | null }>(
      "grocery_items",
      userId,
      "select=name,quantity,unit&checked=eq.false",
      hh,
    ),
    mine<{ name: string; monthly_limit: number | null }>("budget_categories", userId, "select=name,monthly_limit"),
    mine<{ amount: number; type: string }>(
      "budget_transactions",
      userId,
      `select=amount,type&occurred_on=gte.${monthStart}`,
    ),
    mine<{ name: string; target: number; saved: number }>("savings_goals", userId, "select=name,target,saved"),
    mine<{ pages: number }>("quran_reading_sessions", userId, `select=pages&read_on=eq.${today}`),
  ]);

  // Upcoming events, including yearly repeats.
  const upcoming = events
    .map((e) => {
      let date = e.starts_on;
      if (e.repeats_yearly) {
        date = `${today.slice(0, 4)}${e.starts_on.slice(4)}`;
        if (date < today) date = `${Number(today.slice(0, 4)) + 1}${e.starts_on.slice(4)}`;
      }
      return { ...e, date };
    })
    .filter((e) => e.date >= today && e.date <= in30)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 15);

  const weekMeals = plans
    .flatMap((p) => p.plan_data?.days ?? [])
    .filter((d) => d.date >= today && d.date <= in7)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => `${d.date}: ${d.meals.map((m) => `${m.type} – ${m.name}`).join("; ")}`);

  const expiringSoon = pantry
    .filter((p) => p.expiration_date && p.expiration_date <= addDays(today, 5))
    .map((p) => `${p.name} (expires ${p.expiration_date})`);

  const income = spend.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = spend.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const giving = spend.filter((t) => t.type === "sadaqah" || t.type === "zakat").reduce((s, t) => s + Number(t.amount), 0);
  const budget = categories.reduce((s, c) => s + (c.monthly_limit ? Number(c.monthly_limit) : 0), 0);

  const lines = [
    `Today is ${today}${extras.timezone ? ` (${extras.timezone})` : ""}.`,
    profile[0]?.first_name ? `The user's name is ${profile[0].first_name}.` : "",
    extras.location ? `Location: ${extras.location}.` : "",
    extras.prayerTimes
      ? `Today's prayer times: ${Object.entries(extras.prayerTimes).map(([k, v]) => `${k} ${v}`).join(", ")}.`
      : "",
    members.length
      ? `Family members: ${members.map((m) => `${m.first_name} (${m.relationship}${m.birth_date ? `, born ${m.birth_date}` : ""})`).join(", ")}.`
      : "No family members added yet.",
    tasks.length
      ? `Tasks in the next 7 days: ${tasks.map((t) => `${t.scheduled_date}${t.time ? ` ${t.time}` : ""} ${t.title}${t.completed ? " (done)" : ""}`).join("; ")}.`
      : "No tasks in the next 7 days.",
    upcoming.length
      ? `Family calendar, next 30 days: ${upcoming.map((e) => `${e.date} ${e.title} [${e.kind}]`).join("; ")}.`
      : "Nothing on the family calendar in the next 30 days.",
    weekMeals.length ? `Meal plan this week: ${weekMeals.join(" | ")}.` : "No meal plan for this week.",
    pantry.length
      ? `Pantry (${pantry.length} items): ${pantry
          .slice(0, 60)
          .map((p) => (p.tracking === "level" ? `${p.name} (staple, ${p.level ?? "full"})` : `${p.name} ${formatAmount(Number(p.quantity), p.unit)}`))
          .join(", ")}.`
      : "Pantry is empty.",
    members.length ? `Cook for about ${householdFrom(members).portions} portions (children count as ¾ or ½).` : "",
    expiringSoon.length ? `Expiring soon: ${expiringSoon.join(", ")}.` : "",
    groceries.length
      ? `Shopping list: ${groceries.slice(0, 40).map((g) => `${g.name}${g.quantity ? ` ${g.quantity}${g.unit ? ` ${g.unit}` : ""}` : ""}`).join(", ")}.`
      : "Shopping list is empty.",
    `This month: income ${income.toFixed(2)}, spent ${expenses.toFixed(2)}${budget ? ` of a ${budget.toFixed(2)} budget` : ""}, sadaqah/zakat ${giving.toFixed(2)}.`,
    goals.length ? `Savings goals: ${goals.map((g) => `${g.name} ${g.saved}/${g.target}`).join(", ")}.` : "",
    `Quran pages read today: ${quran.reduce((s, q) => s + q.pages, 0)}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

// ── Tools the assistant may call ────────────────────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a household task to the user's planner.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM, optional" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_shopping_items",
      description: "Add items to the user's first shopping list.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
              },
              required: ["name"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_family_event",
      description: "Add an event or ceremony to the family calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM, optional" },
          kind: {
            type: "string",
            enum: ["eid", "aqiqah", "nikah", "walima", "birthday", "anniversary", "school", "appointment", "gathering", "other"],
          },
          location: { type: "string" },
        },
        required: ["title", "date", "kind"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_money",
      description: "Record an expense, income, sadaqah or zakat in the budget.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["expense", "income", "sadaqah", "zakat"] },
          amount: { type: "number" },
          description: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["type", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_pantry",
      description:
        "Update the family pantry when the user says they used, finished, bought or are running low on food. Use amounts the user gave; for vague amounts ('some', 'half') estimate sensibly.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                change: { type: "string", enum: ["used", "added", "finished", "low", "out", "full"] },
                amount: { type: "number", description: "How much was used or added (omit for finished/low/out/full)" },
                unit: { type: "string", description: "g, kg, ml, L, pieces, cups, tbsp…" },
              },
              required: ["name", "change"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cooked_recipe",
      description:
        "Record that the family cooked a recipe from the Firdam library, taking its ingredients out of the pantry for the family's portions.",
      parameters: {
        type: "object",
        properties: {
          recipe: { type: "string", description: "Recipe name, e.g. Chicken Karahi" },
          portions: { type: "number", description: "Only if the user said how many people/portions" },
        },
        required: ["recipe"],
      },
    },
  },
];

interface PantryRow extends PantryLike {
  category: string;
  notes: string | null;
}

function snapshot(p: PantryRow) {
  const { id, name, category, quantity, unit, expiration_date, notes, tracking, level } = p;
  return { id, name, category, quantity, unit, expiration_date, notes, tracking, level };
}

/** Applies pantry changes with history (so the family can undo them in the app). */
async function applyPantry(
  ctx: Ctx,
  changes: ({ kind: "update"; item: PantryRow; patch: Record<string, unknown> } | { kind: "delete"; item: PantryRow } | { kind: "insert"; row: Record<string, unknown> })[],
  label: string,
): Promise<string> {
  const batch = crypto.randomUUID();
  const events: Record<string, unknown>[] = [];
  const owner = { user_id: ctx.userId, household_id: ctx.householdId ?? null };
  for (const c of changes) {
    if (c.kind === "update") {
      const rows = await rest<PantryRow[]>(`pantry_items?id=eq.${c.item.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(c.patch),
      });
      events.push({ ...owner, batch_id: batch, source: "companion", label, pantry_item_id: c.item.id, item_name: c.item.name, before: snapshot(c.item), after: rows[0] ? snapshot(rows[0]) : null });
    } else if (c.kind === "delete") {
      await rest(`pantry_items?id=eq.${c.item.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      events.push({ ...owner, batch_id: batch, source: "companion", label, pantry_item_id: c.item.id, item_name: c.item.name, before: snapshot(c.item), after: null });
    } else {
      const rows = await rest<PantryRow[]>("pantry_items", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ ...owner, ...c.row }),
      });
      if (rows[0]) events.push({ ...owner, batch_id: batch, source: "companion", label, pantry_item_id: rows[0].id, item_name: rows[0].name, before: null, after: snapshot(rows[0]) });
    }
  }
  if (events.length) {
    await rest("pantry_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(events) }).catch(() => undefined);
  }
  return batch;
}

async function loadPantry(ctx: Ctx): Promise<PantryRow[]> {
  return await mine<PantryRow>("pantry_items", ctx.userId, "select=*", ctx.householdId);
}

function bestPantryMatch(pantry: PantryRow[], name: string): PantryRow | null {
  let best: PantryRow | null = null;
  let score = 0;
  for (const p of pantry) {
    const s = matchScore(p.name, name);
    if (s > score) {
      best = p;
      score = s;
    }
  }
  return score >= 2 ? best : null;
}

const PANTRY_UNIT_MAP: Record<string, string> = {
  g: "g", gram: "g", grams: "g", kg: "kg", kilo: "kg", ml: "ml", l: "L", litre: "L", liter: "L", piece: "Pieces", pieces: "Pieces",
  pack: "Pack", bag: "Pack", bottle: "Bottle", can: "Can", tin: "Can", box: "Box",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

async function runTool(name: string, args: Record<string, unknown>, ctx: Ctx): Promise<{ result: string; summary?: string }> {
  const { userId, today } = ctx;
  const household_id = ctx.householdId ?? null;
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  try {
    if (name === "add_task") {
      const title = str(args.title, 160);
      const date = DATE_RE.test(str(args.date)) ? str(args.date) : today;
      const time = TIME_RE.test(str(args.time)) ? str(args.time) : null;
      const priority = ["high", "medium", "low"].includes(str(args.priority)) ? str(args.priority) : "medium";
      if (!title) return { result: "Missing title" };
      await rest("planner_tasks", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, household_id, title, scheduled_date: date, time, priority }),
      });
      return { result: "Task added", summary: `Added task “${title}” on ${date}${time ? ` at ${time}` : ""}` };
    }
    if (name === "add_shopping_items") {
      const items = (Array.isArray(args.items) ? args.items : []).slice(0, 30) as Record<string, unknown>[];
      if (!items.length) return { result: "No items" };
      const lists = await rest<{ id: string }[]>(
        `grocery_lists?${
          household_id ? `or=(user_id.eq.${userId},household_id.eq.${household_id})` : `user_id=eq.${userId}`
        }&select=id&order=created_at.asc&limit=1`,
      );
      let listId = lists[0]?.id;
      if (!listId) {
        const created = await rest<{ id: string }[]>("grocery_lists", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ user_id: userId, household_id, name: "Weekly groceries" }),
        });
        listId = created[0]?.id;
      }
      const rows = items
        .map((i) => ({
          user_id: userId,
          household_id,
          list_id: listId,
          name: str(i.name, 120),
          quantity: typeof i.quantity === "number" && i.quantity > 0 ? i.quantity : null,
          unit: str(i.unit, 20) || null,
          category: "Other",
          note: "Added by your Companion",
        }))
        .filter((r) => r.name);
      await rest("grocery_items", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
      return { result: `Added ${rows.length} items`, summary: `Added ${rows.map((r) => r.name).join(", ")} to Shopping` };
    }
    if (name === "add_family_event") {
      const title = str(args.title, 120);
      const date = str(args.date);
      if (!title || !DATE_RE.test(date)) return { result: "Missing title or valid date" };
      const kinds = ["eid", "aqiqah", "nikah", "walima", "birthday", "anniversary", "school", "appointment", "gathering", "other"];
      const kind = kinds.includes(str(args.kind)) ? str(args.kind) : "other";
      const time = TIME_RE.test(str(args.time)) ? str(args.time) : null;
      await rest("family_events", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, household_id, title, kind, starts_on: date, start_time: time, location: str(args.location) || null }),
      });
      return { result: "Event added", summary: `Added “${title}” to the family calendar on ${date}` };
    }
    if (name === "record_money") {
      const type = ["expense", "income", "sadaqah", "zakat"].includes(str(args.type)) ? str(args.type) : "expense";
      const amount = Number(args.amount);
      if (!Number.isFinite(amount) || amount <= 0) return { result: "Invalid amount" };
      const date = DATE_RE.test(str(args.date)) ? str(args.date) : today;
      await rest("budget_transactions", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: userId,
          type,
          amount: Math.round(amount * 100) / 100,
          description: str(args.description) || null,
          occurred_on: date,
        }),
      });
      return { result: "Recorded", summary: `Recorded ${type} of ${amount.toFixed(2)}${str(args.description) ? ` (${str(args.description)})` : ""}` };
    }
    if (name === "update_pantry") {
      const items = (Array.isArray(args.items) ? args.items : []).slice(0, 25) as Record<string, unknown>[];
      if (!items.length) return { result: "No items" };
      const pantry = await loadPantry(ctx);
      const changes: Parameters<typeof applyPantry>[1] = [];
      const done: string[] = [];
      for (const it of items) {
        const itemName = str(it.name, 80);
        const change = str(it.change);
        const amount = typeof it.amount === "number" && it.amount > 0 ? it.amount : null;
        const unit = str(it.unit, 20).toLowerCase().replace(/s$/, "");
        if (!itemName) continue;
        const match = bestPantryMatch(pantry, itemName);
        if (change === "added") {
          const pUnit = PANTRY_UNIT_MAP[unit] ?? (amount ? "Pieces" : "Pack");
          if (match && match.tracking === "level") {
            changes.push({ kind: "update", item: match, patch: { level: "full" } });
            done.push(`${match.name} → full`);
            continue;
          }
          if (match && amount) {
            const base = toBase(amount, pUnit, itemName);
            const inUnit = base ? toUnit(base.amount, base.base, match.unit, itemName) : pUnit === match.unit ? amount : null;
            if (inUnit != null) {
              const q = +(Number(match.quantity) + inUnit).toFixed(3);
              changes.push({ kind: "update", item: match, patch: { quantity: q } });
              done.push(`${match.name} +${formatAmount(amount, pUnit)}`);
              continue;
            }
          }
          changes.push({ kind: "insert", row: { name: itemName.replace(/^\w/, (c) => c.toUpperCase()), category: "Other", quantity: amount ?? 1, unit: pUnit, tracking: "count" } });
          done.push(`added ${itemName}`);
          continue;
        }
        if (!match) {
          done.push(`${itemName} isn't in the pantry`);
          continue;
        }
        if (change === "finished" || (change === "out" && match.tracking !== "level")) {
          if (match.tracking === "level") changes.push({ kind: "update", item: match, patch: { level: "out" } });
          else changes.push({ kind: "delete", item: match });
          done.push(`${match.name} finished`);
        } else if (change === "low" || change === "out" || change === "full") {
          if (match.tracking === "level") {
            changes.push({ kind: "update", item: match, patch: { level: change } });
            done.push(`${match.name} → ${change}`);
          } else if (change === "low") {
            changes.push({ kind: "update", item: match, patch: { quantity: +(Number(match.quantity) / 3).toFixed(2) } });
            done.push(`${match.name} running low`);
          }
        } else if (change === "used") {
          if (match.tracking === "level") {
            done.push(`${match.name} is a staple (still ${match.level ?? "full"})`);
            continue;
          }
          const q = Number(match.quantity) || 0;
          let use: number | null = null;
          if (amount) {
            const base = toBase(amount, PANTRY_UNIT_MAP[unit] ?? (unit || "Pieces"), itemName);
            use = base ? toUnit(base.amount, base.base, match.unit, itemName) : null;
            if (use == null && (PANTRY_UNIT_MAP[unit] ?? "") === match.unit) use = amount;
          }
          if (use == null) use = q / 2;
          const left = +(q - use).toFixed(3);
          changes.push(left <= 0.0001 ? { kind: "delete", item: match } : { kind: "update", item: match, patch: { quantity: left } });
          done.push(left <= 0.0001 ? `${match.name} finished` : `${match.name}: ${formatAmount(left, match.unit)} left`);
        }
      }
      if (!changes.length) return { result: done.join("; ") || "Nothing to change" };
      await applyPantry(ctx, changes, "Told the Companion");
      return { result: `Updated: ${done.join("; ")}`, summary: `Pantry updated: ${done.join("; ")} (you can undo on the Pantry page)` };
    }
    if (name === "cooked_recipe") {
      const recipeName = str(args.recipe, 120);
      if (!recipeName) return { result: "Missing recipe" };
      type R = { id: string; name: string; servings: number | null; recipe_ingredients: { quantity: number | null; unit: string | null; optional: boolean | null; ingredient: { name: string } | null }[] };
      const found = await rest<R[]>(
        `recipes?select=id,name,servings,recipe_ingredients(quantity,unit,optional,ingredient:ingredients(name))&is_active=eq.true&name=ilike.*${encodeURIComponent(recipeName.replace(/[*,()]/g, " "))}*&limit=1`,
      );
      const recipe = found[0];
      if (!recipe) return { result: `No library recipe called "${recipeName}". Offer to update the pantry item by item instead.` };
      let portions = typeof args.portions === "number" && args.portions > 0 ? args.portions : null;
      if (!portions) {
        const members = await mine<{ birth_date: string | null; relationship: string }>("family_members", ctx.userId, "select=birth_date,relationship", ctx.householdId);
        portions = members.length ? householdFrom(members).portions : recipe.servings || 4;
      }
      const pantry = await loadPantry(ctx);
      const needs = recipe.recipe_ingredients
        .filter((i) => i.ingredient?.name)
        .map((i) => ({ name: i.ingredient!.name, quantity: i.quantity != null && Number(i.quantity) > 0 ? Number(i.quantity) : null, unit: i.unit ?? "", optional: !!i.optional }));
      const check = checkNeeds(needs, pantry, { factor: portions / (recipe.servings || portions) });
      const deductions = deductionsFor(check);
      const byId = new Map(pantry.map((p) => [p.id, p]));
      const batch = await applyPantry(
        ctx,
        deductions.map((d) => {
          const item = byId.get(d.item.id)!;
          return d.newQuantity <= 0.0001 ? { kind: "delete" as const, item } : { kind: "update" as const, item, patch: { quantity: d.newQuantity } };
        }),
        `Cooked ${recipe.name}`,
      );
      await rest("cooking_log", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: ctx.userId,
          household_id: ctx.householdId ?? null,
          cooked_on: today,
          status: "cooked",
          recipe_key: `c-${recipe.id}`,
          recipe_name: recipe.name,
          servings: portions,
          batch_id: batch,
        }),
      });
      const used = deductions.map((d) => `${d.item.name} −${formatAmount(d.use, d.item.unit)}`).join(", ");
      return {
        result: `Logged ${recipe.name} for ${portions} portions. ${used ? `Took from pantry: ${used}.` : "Nothing tracked in the pantry was used."}`,
        summary: `Cooked ${recipe.name}${used ? ` — pantry updated (${used})` : ""}`,
      };
    }
    return { result: "Unknown tool" };
  } catch (err) {
    return { result: `Failed: ${err instanceof Error ? err.message : "error"}` };
  }
}

const SYSTEM_PROMPT = `You are the Firdam Family Companion, a warm, respectful and practical assistant for Muslim families.

How you help:
- Plan the family's days, meals, shopping, budget, Ramadan and events, using the family data provided below.
- When the user clearly asks you to add, record or schedule something, use the tools. Confirm briefly what you did. Never invent data you weren't given.
- Keep the pantry accurate: when the user mentions using, finishing or buying food ("we used 3 potatoes", "rice is almost gone", "I bought 2 kg chicken"), call update_pantry. When they say they cooked a library recipe, call cooked_recipe.
- When suggesting meals, check the pantry amounts and the family's portions shown below; say what needs buying.
- Keep answers short, clear and kind. Use the user's name occasionally. Use simple Islamic greetings and phrases naturally (e.g. "in sha Allah"), without overdoing it.
- All food suggestions must be halal (no pork, no alcohol, halal meat).

Religious questions:
- You may share general, well-established knowledge (e.g. what breaks the fast, how to pray while travelling), mention where scholars differ, and suggest asking a qualified local scholar for personal rulings. Never issue fatwas or claim certainty on disputed matters. Quote Quran or hadith only if you are certain of the wording and source.

Health, legal and financial matters: give general information only and suggest a professional for personal advice.

Data privacy: only discuss this user's own family data shown below.`;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = env("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "The Companion is not set up yet.", code: "not_configured" }, 501);

    const user = await getUser(req);
    if (!user) return json({ error: "Please sign in." }, 401);

    const plan = await getPlan(user.id);
    if (plan === "free") {
      const used = await countUsageThisMonth(user.id, "companion");
      if (used >= FREE_COMPANION_MESSAGES_PER_MONTH) {
        return json(
          {
            error: "The Family Companion is part of Premium and Family+. Try “What can I cook?” in Recipes — it’s free.",
            code: "limit_reached",
          },
          402,
        );
      }
    } else {
      const used = await countUsageToday(user.id, "companion");
      if (used >= PAID_COMPANION_MESSAGES_PER_DAY) {
        return json(
          {
            error: `You've reached today's ${PAID_COMPANION_MESSAGES_PER_DAY} Companion messages. They reset in 24 hours.`,
            code: "fair_use",
          },
          429,
        );
      }
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: { role: string; content: string }[];
      today?: string;
      timezone?: string;
      prayerTimes?: Record<string, string>;
      location?: string;
    };
    const today = body.today && DATE_RE.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
    const history = (body.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 4000) }));
    if (!history.length || history[history.length - 1].role !== "user") {
      return json({ error: "Send a message." }, 400);
    }

    const membership = await rest<{ household_id: string }[]>(
      `household_members?user_id=eq.${user.id}&select=household_id`,
    ).catch(() => []);
    const ctx: Ctx = { userId: user.id, today, householdId: membership[0]?.household_id ?? null };
    const familyContext = await buildContext(ctx, {
      prayerTimes: body.prayerTimes,
      location: typeof body.location === "string" ? body.location.slice(0, 120) : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone.slice(0, 60) : undefined,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\nFamily data:\n${familyContext}` },
      ...history,
    ];
    const actions: { type: string; summary: string }[] = [];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await fetchOpenAI(apiKey, {
        model: MODEL,
        messages,
        temperature: 0.5,
        max_tokens: 700,
        tools: round < MAX_TOOL_ROUNDS ? TOOLS : undefined,
      });
      if (!res.ok) {
        const fail = await describeOpenAIFailure(res);
        return json({ error: fail.message, code: fail.code }, fail.status);
      }
      const data = (await res.json()) as { choices?: { message?: ChatMessage }[] };
      const msg = data.choices?.[0]?.message;
      if (!msg) return json({ error: "Empty AI response." }, 502);

      if (msg.tool_calls?.length) {
        messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
        for (const call of msg.tool_calls.slice(0, 5)) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch {
            // leave empty
          }
          const out = await runTool(call.function.name, args, ctx);
          if (out.summary) actions.push({ type: call.function.name, summary: out.summary });
          messages.push({ role: "tool", tool_call_id: call.id, content: out.result });
        }
        continue;
      }

      await recordUsage(user.id, "companion");
      return json({ reply: msg.content ?? "", actions });
    }
    await recordUsage(user.id, "companion");
    return json({ reply: "Done.", actions });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
