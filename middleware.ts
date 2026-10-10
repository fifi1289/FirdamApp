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

  // Protect app routes — bounce unauthenticated users to the login page.
  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // The reset page signs you in from the email link itself, whatever session
  // this browser already has, so leave it alone.
  if (request.nextUrl.pathname === '/auth/reset-password') return response;

  // Two-step verification: a signed-in session that still needs its code can
  // only reach the code page (and public pages) until it's verified.
  if (user && (!isPublicPath(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith('/auth'))) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsCode = aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2';
    const onCodePage = request.nextUrl.pathname === '/verify-2fa';
    if (needsCode && !onCodePage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/verify-2fa';
      redirectUrl.search = '';
      if (!request.nextUrl.pathname.startsWith('/auth')) redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    if (!needsCode && onCodePage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If an authenticated user lands on an auth page, send them to the dashboard.
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
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
