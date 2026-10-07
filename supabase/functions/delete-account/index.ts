import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUser } from "../_shared/plan.ts";

/**
 * Permanently deletes the signed-in user's account (Settings → Delete my account).
 * - cancels an active Stripe subscription (if Stripe is set up),
 * - hands a shared household to another member if the user owns it,
 * - deletes the auth user; every table references auth.users with
 *   ON DELETE CASCADE, so all their rows go with it.
 *
 * POST { confirm: "DELETE" }
 */

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Please sign in." }, 401);
    const body = (await req.json().catch(() => ({}))) as { confirm?: string };
    if (body.confirm !== "DELETE") return json({ error: "Confirmation missing." }, 400);

    // 1. Cancel a live Stripe subscription so they aren't charged again.
    const stripeKey = env("STRIPE_SECRET_KEY");
    const subs = await rest<{ stripe_subscription_id: string | null; status: string }[]>(
      `subscriptions?user_id=eq.${user.id}&select=stripe_subscription_id,status`,
    ).catch(() => []);
    for (const s of subs) {
      if (stripeKey && s.stripe_subscription_id && ["active", "trialing", "past_due", "unpaid"].includes(s.status)) {
        const res = await fetch(`https://api.stripe.com/v1/subscriptions/${s.stripe_subscription_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${stripeKey}` },
        });
        if (!res.ok && res.status !== 404) {
          return json({ error: "We couldn't cancel your subscription automatically. Please cancel it in Settings first." }, 502);
        }
      }
    }

    // 2. Hand a shared household to the longest-standing other member.
    const owned = await rest<{ id: string }[]>(`households?owner_id=eq.${user.id}&select=id`).catch(() => []);
    for (const h of owned) {
      const others = await rest<{ user_id: string }[]>(
        `household_members?household_id=eq.${h.id}&user_id=neq.${user.id}&select=user_id&order=joined_at.asc&limit=1`,
      );
      if (others[0]) {
        await rest(`households?id=eq.${h.id}`, { method: "PATCH", body: JSON.stringify({ owner_id: others[0].user_id }) });
        await rest(`household_members?household_id=eq.${h.id}&user_id=eq.${others[0].user_id}`, {
          method: "PATCH",
          body: JSON.stringify({ role: "owner" }),
        });
      }
    }

    // 3. Delete the login; everything else cascades.
    const res = await fetch(`${env("SUPABASE_URL")}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { apikey: env("SUPABASE_SERVICE_ROLE_KEY")!, Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
    });
    if (!res.ok) {
      console.error("Delete user failed", res.status, await res.text());
      return json({ error: "Something went wrong deleting your account." }, 500);
    }
    return json({ deleted: true });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
