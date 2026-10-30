import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { FREE_LAUNCH } from '@/lib/plan/launch';

const PUBLIC_PATHS = ['/partners', '/privacy', '/terms', '/security', '/support', '/auth', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'];

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  );
}

export async function middleware(request: NextRequest) {
  // Nothing is sold yet: send the plans page straight home (the page's own
  // redirect took ~30 s on Cloudflare).
  if (FREE_LAUNCH && request.nextUrl.pathname.startsWith('/dashboard/upgrade')) {
    const home = request.nextUrl.clone();
    home.pathname = '/dashboard';
    home.search = '';
    return NextResponse.redirect(home);
  }

  // Admin is English only, whatever language the visitor uses: the layout
  // reads this to render /admin in English, left to right.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-firdam-path', request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Where the visitor is (Cloudflare's guess from the IP), so partner lists can
  // start with the shops that deliver there. Only the two-letter country.
  const country = request.headers.get('cf-ipcountry');
  if (country && /^[A-Z]{2}$/.test(country) && country !== 'XX' && request.cookies.get('firdam_country')?.value !== country) {
    response.cookies.set('firdam_country', country, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  }

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
