import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { countUsageToday, getPlan, getUser, recordUsage, FREE_COMPANION_MESSAGES_PER_DAY } from "../_shared/plan.ts";

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

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const MAX_HISTORY = 16;
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
    mine<{ name: string; quantity: number; unit: string; expiration_date: string | null }>(
      "pantry_items",
      userId,
      "select=name,quantity,unit,expiration_date",
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
    pantry.length ? `Pantry (${pantry.length} items): ${pantry.slice(0, 40).map((p) => p.name).join(", ")}.` : "Pantry is empty.",
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
];

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
    return { result: "Unknown tool" };
  } catch (err) {
    return { result: `Failed: ${err instanceof Error ? err.message : "error"}` };
  }
}

const SYSTEM_PROMPT = `You are the Firdam Family Companion, a warm, respectful and practical assistant for Muslim families.

How you help:
- Plan the family's days, meals, shopping, budget, Ramadan and events, using the family data provided below.
- When the user clearly asks you to add, record or schedule something, use the tools. Confirm briefly what you did. Never invent data you weren't given.
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
      const used = await countUsageToday(user.id, "companion");
      if (used >= FREE_COMPANION_MESSAGES_PER_DAY) {
        return json(
          {
            error: `You've used today's ${FREE_COMPANION_MESSAGES_PER_DAY} free Companion messages. Upgrade for unlimited.`,
            code: "limit_reached",
          },
          402,
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
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.5,
          tools: round < MAX_TOOL_ROUNDS ? TOOLS : undefined,
        }),
      });
      if (!res.ok) return json({ error: `AI request failed (${res.status}).` }, 502);
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
