import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * The links in Firdam's emails (confirm your account, change your email…) come
 * here on firdam.com instead of a supabase.co address. We check the one-time
 * token and sign the person in, then send them on their way.
 *   /auth/confirm?token_hash=…&type=email|signup|email_change|magiclink|invite|recovery&next=…
 */
const TYPES: EmailOtpType[] = ['email', 'signup', 'email_change', 'magiclink', 'invite', 'recovery'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { origin, searchParams } = url;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // Only same-site destinations: a path, or a full firdam.com address.
  let next = searchParams.get('next') ?? '';
  try {
    if (next.startsWith('http')) {
      const target = new URL(next);
      next = target.origin === origin ? `${target.pathname}${target.search}` : '';
    }
  } catch {
    next = '';
  }
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/auth/')) next = '/dashboard';
  if (type === 'recovery') next = '/auth/reset-password';

  if (tokenHash && type && TYPES.includes(type)) {
    const cookieStore = cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  // Expired or already used: the sign-in page explains and offers to sign in.
  return NextResponse.redirect(`${origin}/auth/login?link=expired`);
}
