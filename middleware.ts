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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
          // Anti-caching headers required by @supabase/ssr so refreshed
          // session cookies are never served to a different user by a CDN
          // or reverse proxy.
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    }
  );

  // Refresh the session token so `setAll` writes any updated auth cookies
  // back to the response. Required by the @supabase/ssr middleware contract —
  // without this call, refreshed tokens are never persisted and sessions
  // silently expire. This is session maintenance only; it does not gate access
  // (auth redirects are currently disabled).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on every route except static assets and image files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
