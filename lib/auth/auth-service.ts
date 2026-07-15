import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Auth service layer.
 *
 * Pure business logic — no UI. Every function takes a Supabase client
 * (browser or server) so it stays reusable across client and server
 * contexts without duplicating code. All errors are mapped to
 * user-friendly messages by `getAuthErrorMessage`.
 */

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResult {
  /** When true the caller should route to the verify-email screen. */
  needsEmailVerification: boolean;
}

export async function signUp(
  supabase: SupabaseClient<Database>,
  input: SignUpInput
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    },
  });

  if (error) throw error;

  // Email confirmation enabled in Supabase → a verification email is sent
  // and the user cannot log in until they click the link.
  return { needsEmailVerification: true };
}

export async function signIn(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(supabase: SupabaseClient<Database>): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(
  supabase: SupabaseClient<Database>,
  newPassword: string
): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Map Supabase Auth error codes to user-friendly copy. Falls back to the
 * raw error message for unexpected cases so nothing is silently hidden.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = String((error as { message: string }).message).toLowerCase();

    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'The email or password you entered is incorrect.';
    }
    if (msg.includes('user already registered') || msg.includes('already been registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return 'Please verify your email before signing in. Check your inbox for the verification link.';
    }
    if (msg.includes('password') && msg.includes('weak')) {
      return 'That password is too weak. Use at least 8 characters with a mix of letters and numbers.';
    }
    if (msg.includes('password') && msg.includes('6')) {
      return 'Password must be at least 6 characters.';
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      return 'Could not reach the server. Check your internet connection and try again.';
    }
    if (msg.includes('expired') || msg.includes('session')) {
      return 'Your session has expired. Please sign in again.';
    }

    return String((error as { message: string }).message);
  }

  return 'Something went wrong. Please try again.';
}
