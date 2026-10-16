import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Completes "Continue with Google": Supabase redirects here with a one-time
// code, we exchange it for a session and send the user on their way.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect');

  // Only allow relative same-site redirects after sign-in.
  const safeRedirect =
    redirect && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeRedirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
