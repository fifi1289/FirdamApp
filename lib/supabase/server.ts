import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

/**
 * Server Supabase client for Server Components, Route Handlers, and Server
 * Actions. Uses the official `getAll` / `setAll` cookie strategy so token
 * refreshes are written back to the response cookies correctly.
 *
 * Always create a new client per request — never share across requests.
 */
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }

  const cookieStore = cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
