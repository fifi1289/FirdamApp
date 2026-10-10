// Shared OpenAI helpers: retries short rate limits and turns OpenAI errors
// into messages people (and the Firdam team) can act on.

export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const MAX_RETRIES = 2;

/** POSTs to Chat Completions, retrying brief rate limits (not quota errors). */
export async function fetchOpenAI(apiKey: string, body: unknown): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt >= MAX_RETRIES) return res;

    // Out of credit won't fix itself by waiting — return straight away.
    const text = await res.clone().text();
    if (/insufficient_quota|billing/i.test(text)) return res;

    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : 1500 * (attempt + 1);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

export interface OpenAIFailure {
  /** HTTP status to send back to the app. */
  status: number;
  /** Friendly message for the person using the app. */
  message: string;
  /** Short machine code, e.g. `ai_quota`, `ai_busy`, `ai_key`. */
  code: string;
}

/** Reads a failed OpenAI response, logs the details and returns a friendly error. */
export async function describeOpenAIFailure(res: Response): Promise<OpenAIFailure> {
  const text = await res.text().catch(() => "");
  let type = "";
  let detail = "";
  try {
    const parsed = JSON.parse(text) as { error?: { type?: string; code?: string; message?: string } };
    type = parsed.error?.code ?? parsed.error?.type ?? "";
    detail = parsed.error?.message ?? "";
  } catch {
    detail = text.slice(0, 300);
  }
  // Visible in Supabase → Edge Functions → Logs.
  console.error(`OpenAI ${res.status} ${type}: ${detail}`);

  if (res.status === 429 && /insufficient_quota|credit_balance|no credits|billing/i.test(type + detail)) {
    return {
      status: 503,
      code: "ai_quota",
      message:
        "The AI service has run out of credit. The Firdam team needs to add credit to the OpenAI account (platform.openai.com → Billing).",
    };
  }
  if (res.status === 429) {
    return { status: 503, code: "ai_busy", message: "The AI is busy right now. Please try again in a minute." };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      status: 503,
      code: "ai_key",
      message: "The AI key isn't valid. The Firdam team needs to update OPENAI_API_KEY in Supabase.",
    };
  }
  if (res.status === 404 && /model/i.test(detail)) {
    return { status: 503, code: "ai_model", message: "This AI account can't use the selected model yet." };
  }
  return { status: 502, code: "ai_error", message: "The AI couldn't answer just now. Please try again." };
}
