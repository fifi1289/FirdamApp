import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }

  const cookieStore = cookies();

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Cookie: cookieStore
          .getAll()
          .map((c) => `${c.name}=${c.value}`)
          .join('; '),
      },
    },
  });
}
