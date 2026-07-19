import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

/**
 * Server-side route guard for protected pages.
 *
 * Validates the session server-side via `getUser()` (which revalidates the
 * access token against the Supabase Auth server) and returns the user's
 * profile. Redirects to /auth/login if there is no valid session.
 *
 * Use at the top of a Server Component page:
 *   const { profile } = await requireAuth();
 */
export async function requireAuth(): Promise<{ profile: Profile | null }> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log('[requireAuth] getUser() returned user:', user ? 'yes' : 'no');
  if (error) {
    console.log('[requireAuth] getUser() error:', error);
  }

  if (!user) {
    redirect('/auth/login');
  }

  // Best-effort profile fetch — the row may not exist yet right after signup.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { profile };
}
