import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { supabase } from './supabase';

/** Calls a Supabase edge function as the signed-in user. GET by default; pass body to POST. */
export async function callFunction<T>(name: string, params?: Record<string, string | number>, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const qs = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}` : '';
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}${qs}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !json) throw new Error(json?.error ?? `Something went wrong (${res.status}).`);
  return json;
}
