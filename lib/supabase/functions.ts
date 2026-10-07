import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export class EdgeFunctionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.status = status;
  }
}

/**
 * Calls a Supabase edge function with the signed-in user's access token.
 * GET by default; pass `body` to POST JSON.
 */
export async function callEdgeFunction<T>(
  name: string,
  params?: Record<string, string | number | undefined>,
  options?: { body?: unknown; signal?: AbortSignal }
): Promise<T> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new EdgeFunctionError('Please sign in to continue.', 401);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const query = qs.toString();
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}${query ? `?${query}` : ''}`;

  const res = await fetch(url, {
    method: options?.body !== undefined ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // keep default message
    }
    throw new EdgeFunctionError(message, res.status);
  }
  return (await res.json()) as T;
}
