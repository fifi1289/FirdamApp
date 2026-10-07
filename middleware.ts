import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/privacy', '/terms', '/security', '/support', '/auth', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'];

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session and propagate refreshed auth cookies to the response.
  // This is what keeps the browser client's session in sync so auth.uid()
  // resolves correctly for RLS-protected queries.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Two-step verification: signed in with a password but the code not entered yet.
  let needsCode = false;
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsCode = aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2';
  }
  const path = request.nextUrl.pathname;

  // Protect app routes — bounce unauthenticated users to the login page.
  if (!user && !isPublicPath(path)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  // Ask for the authenticator code before showing any private page.
  if (user && needsCode && !isPublicPath(path)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.search = '';
    redirectUrl.searchParams.set('mfa', '1');
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  // If an authenticated user lands on an auth page, send them to the dashboard
  // (unless they still need to enter their two-step code on the login page).
  if (user && path.startsWith('/auth') && !(needsCode && path.startsWith('/auth/login'))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
