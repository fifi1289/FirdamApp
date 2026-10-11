import { NextResponse, type NextRequest } from 'next/server';

/**
 * The app's "Continue with Google" opens this firdam.com address first, so the
 * iPhone sign-in prompt names firdam.com; it then forwards to Supabase's Google
 * sign-in. Only Supabase's own sign-in address is accepted.
 */
const ALLOWED = 'https://psxwslmsjdtfzneoujea.supabase.co/auth/v1/authorize?';

export function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('to') ?? '';
  if (!target.startsWith(ALLOWED)) {
    return NextResponse.json({ error: 'Not a Firdam sign-in link.' }, { status: 400 });
  }
  return NextResponse.redirect(target, 302);
}
