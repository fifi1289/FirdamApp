/**
 * Shared helpers for enforcing plan limits inside edge functions.
 * Uses the Supabase REST API with the service role (provided by Supabase).
 */

export const FREE_AI_PLANS_PER_MONTH = 2;

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

export async function countUsageThisMonth(userId: string, kind: string): Promise<number> {
  const url = env("SUPABASE_URL");
  const headers = serviceHeaders();
  if (!url || !headers) return 0;
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
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
