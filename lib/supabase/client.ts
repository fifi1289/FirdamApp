import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

/**
 * Browser Supabase client. Reads/writes auth cookies via the
 * `@supabase/ssr` cookie strategy so the session survives full
 * page refreshes and is visible to server components + middleware.
 *
 * A single shared instance is used so `onAuthStateChange` listeners
 * are wired once.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, anonKey);
  }
  return browserClient;
}
