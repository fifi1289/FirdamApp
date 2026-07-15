import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

/**
 * Routes that require an authenticated session. Unauthenticated users
 * are redirected to /auth/login. Add new protected paths here as the
 * application grows.
 */
const PROTECTED_PREFIXES = ['/dashboard', '/profile', '/settings'];

/**
 * Auth routes — logged-in users are bounced back to /dashboard so they
 * don't see login/register screens again.
 */
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set(name, '');
          response.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  // Refresh the session on every matched request. This also reads the
  // current session so we can guard routes without an extra round-trip.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Unauthenticated → redirect to login, preserving the intended destination.
  if (isProtected && !session) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in → don't show login/register/forgot-password again.
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  // Run on every route except static assets and API internals.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
