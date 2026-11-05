import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUser } from "../_shared/plan.ts";

/**
 * Admin only: sends an email from Firdam's own address (Admin → Partners →
 * "Send email"), so replies to partners never come from a personal inbox.
 *
 * POST { to, subject, text, applicationId? }
 *
 * Uses Resend (resend.com). Secrets, set in Supabase → Edge Functions → Secrets:
 *   RESEND_API_KEY   required
 *   EMAIL_FROM       optional, default "Firdam <partners@firdam.com>"
 *   EMAIL_REPLY_TO   optional, default "support@firdam.com"
 * Every email sent is kept in public.email_log.
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

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text → simple HTML: paragraphs, line breaks and clickable links. */
function toHtml(text: string): string {
  const body = escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#8a5a3b">$1</a>');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#2b211b;max-width:600px">${body}</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Please sign in." }, 401);

    // Admins only: ask the database with the caller's own token.
    const url = env("SUPABASE_URL")!;
    const adminRes = await fetch(`${url}/rest/v1/rpc/is_admin`, {
      method: "POST",
      headers: { apikey: env("SUPABASE_ANON_KEY")!, Authorization: req.headers.get("Authorization")!, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!adminRes.ok || (await adminRes.json()) !== true) return json({ error: "Admins only." }, 403);

    const key = env("RESEND_API_KEY");
    if (!key) return json({ error: "Email isn't set up yet: add RESEND_API_KEY in Supabase → Edge Functions → Secrets." }, 503);

    const body = (await req.json().catch(() => ({}))) as { to?: string; subject?: string; text?: string; applicationId?: string };
    const to = (body.to ?? "").trim();
    const subject = (body.subject ?? "").trim();
    const text = (body.text ?? "").trim();
    if (!EMAIL.test(to)) return json({ error: "That email address doesn't look right." }, 400);
    if (!subject || subject.length > 200) return json({ error: "Please add a subject (up to 200 characters)." }, 400);
    if (!text || text.length > 20000) return json({ error: "Please write the message." }, 400);

    const from = env("EMAIL_FROM") ?? "Firdam <partners@firdam.com>";
    const replyTo = env("EMAIL_REPLY_TO") ?? "support@firdam.com";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text, html: toHtml(text) }),
    });
    const out = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return json({ error: `The email wasn't sent: ${out.message ?? res.status}` }, 502);

    // Keep a copy (service role, so admins can read it back in the admin page).
    const service = env("SUPABASE_SERVICE_ROLE_KEY");
    if (service) {
      await fetch(`${url}/rest/v1/email_log`, {
        method: "POST",
        headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: to,
          from_email: from,
          subject,
          body: text,
          sent_by: user.id,
          application_id: body.applicationId ?? null,
          provider_id: out.id ?? null,
        }),
      }).catch(() => undefined);
    }
    return json({ ok: true, id: out.id ?? null });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
