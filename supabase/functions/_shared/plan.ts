/**
 * Shared helpers for enforcing plan limits inside edge functions.
 * Uses the Supabase REST API with the service role (provided by Supabase).
 */

// Keep in sync with lib/plan/plan.ts. Each Companion message costs roughly
// $0.001–0.002 in OpenAI fees, an AI meal plan roughly $0.003–0.005.
export const FREE_AI_PLANS_PER_MONTH = 1;
// The Companion chat is a paid feature; Free users get pantry matching (no AI) instead.
export const FREE_COMPANION_MESSAGES_PER_MONTH = 0;
// Fair-use caps for paid plans, so one account can't run up a large bill.
// About two AI plans a week (a plan covers 3, 5 or 7 days); regenerating counts as a new plan.
export const PAID_AI_PLANS_PER_MONTH = 8;
// Receipt scans (paid plans only): about $0.01 each in OpenAI fees.
export const PAID_RECEIPT_SCANS_PER_MONTH = 30;
export const PAID_COMPANION_MESSAGES_PER_DAY = 20;

// Free launch: everyone gets the full app (with the fair-use caps above) and
// nothing is sold. Keep in sync with FREE_LAUNCH in lib/plan/plan.ts.
export const FREE_LAUNCH = true;

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export async function getUser(req: Request): Promise<AuthUser | null> {
  const auth = req.headers.get("Authorization");
  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY");
  if (!auth || !url || !anon) return null;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon } });
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

function serviceHeaders(): Record<string, string> | null {
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!service) return null;
  return { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
}

export async function getPlan(userId: string): Promise<"free" | "premium" | "family"> {
  if (FREE_LAUNCH) return "family";
  const url = env("SUPABASE_URL");
  const headers = serviceHeaders();
  if (!url || !headers) return "free";
  const res = await fetch(
    `${url}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=plan,status,current_period_end`,
    { headers },
  );
  if (!res.ok) return "free";
  const rows = (await res.json()) as { plan: string; status: string; current_period_end: string | null }[];
  const sub = rows[0];
  if (!sub) return "free";
  const live = ["active", "trialing", "past_due"].includes(sub.status);
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
  if (!live || !notExpired) return "free";
  return sub.plan === "family" ? "family" : sub.plan === "premium" ? "premium" : "free";
}

export function countUsageThisMonth(userId: string, kind: string): Promise<number> {
  const now = new Date();
  return countUsageSince(userId, kind, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString());
}

/** Usage in the last 24 hours (a rolling "day" that ignores time zones). */
export function countUsageToday(userId: string, kind: string): Promise<number> {
  return countUsageSince(userId, kind, new Date(Date.now() - 24 * 3600_000).toISOString());
}

async function countUsageSince(userId: string, kind: string, since: string): Promise<number> {
  const url = env("SUPABASE_URL");
  const headers = serviceHeaders();
  if (!url || !headers) return 0;
  const res = await fetch(
    `${url}/rest/v1/ai_usage?user_id=eq.${encodeURIComponent(userId)}&kind=eq.${encodeURIComponent(kind)}&created_at=gte.${encodeURIComponent(since)}&select=id`,
    { headers: { ...headers, Prefer: "count=exact", Range: "0-0" } },
  );
  const range = res.headers.get("content-range"); // e.g. "0-0/3" or "*/0"
  const total = range?.split("/")[1];
  return total && total !== "*" ? Number(total) : 0;
}

export async function recordUsage(userId: string, kind: string): Promise<void> {
  const url = env("SUPABASE_URL");
  const headers = serviceHeaders();
  if (!url || !headers) return;
  await fetch(`${url}/rest/v1/ai_usage`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, kind }),
  });
}

/** True when the user is listed in `app_admins`. */
export async function isAdminUser(userId: string): Promise<boolean> {
  const url = env("SUPABASE_URL");
  const headers = serviceHeaders();
  if (!url || !headers) return false;
  const res = await fetch(`${url}/rest/v1/app_admins?user_id=eq.${encodeURIComponent(userId)}&select=user_id`, {
    headers,
  });
  if (!res.ok) return false;
  return ((await res.json()) as unknown[]).length > 0;
}
