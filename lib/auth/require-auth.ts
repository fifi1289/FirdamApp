import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function requireAuth(): Promise<{ profile: Profile | null }> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { profile };
}
