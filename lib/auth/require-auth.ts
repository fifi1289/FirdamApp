import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

/**
 * Server-side route guard for protected pages.
 *
 * Returns the authenticated user's profile if they have a valid session.
 * Redirects to /auth/login (preserving the destination) otherwise.
 *
 * Use at the top of a Server Component page:
 *   const { profile } = await requireAuth();
 */
export async function requireAuth(): Promise<{ profile: Profile | null }> {
  const supabase = createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Best-effort profile fetch — the row may not exist yet right after signup.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  return { profile };
}
