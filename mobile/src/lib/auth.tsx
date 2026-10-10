import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { WEBSITE } from './config';
import { resetKitchen } from './kitchen-store';
import { supabase } from './supabase';

interface AuthState {
  /** True until the saved sign-in has been checked on launch. */
  loading: boolean;
  session: Session | null;
  /** Signed in with a password, but two-step verification is on and the code is still needed. */
  needsCode: boolean;
  firstName: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function codeStillNeeded(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.currentLevel === 'aal1' && data.nextLevel === 'aal2';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

  const load = useCallback(async (next: Session | null) => {
    setSession(next);
    if (!next) {
      setNeedsCode(false);
      setFirstName(null);
      return;
    }
    const mustVerify = await codeStillNeeded();
    setNeedsCode(mustVerify);
    // The profile is protected until the code is entered, so read it afterwards.
    const fromSignUp = (next.user.user_metadata?.first_name as string | undefined) ?? null;
    if (mustVerify) {
      setFirstName(fromSignUp);
      return;
    }
    const { data } = await supabase.from('profiles').select('first_name').eq('id', next.user.id).maybeSingle();
    setFirstName((data?.first_name as string | null | undefined) ?? fromSignUp);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      await load(data.session);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase advises not awaiting other Supabase calls inside this callback.
      setTimeout(() => void load(next), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      needsCode,
      firstName,
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await load(data.session);
      },
      signUp: async ({ email, password, firstName: first, lastName }) => {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${WEBSITE}/auth/login`,
            data: { first_name: first.trim(), last_name: lastName.trim() },
          },
        });
        if (error) throw error;
      },
      verifyCode: async (code) => {
        const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
        if (listError) throw listError;
        const factor = factors.totp.find((f) => f.status === 'verified');
        if (!factor) {
          setNeedsCode(false);
          return;
        }
        const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        await load(data.session);
      },
      sendPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${WEBSITE}/auth/reset-password`,
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        resetKitchen();
      },
    }),
    [loading, session, needsCode, firstName, load]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}

/** Turns Supabase's sign-in errors into plain words. */
export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Try again.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first — check your inbox for the link.';
  if (/already registered|already exists/i.test(message)) return 'An account with this email already exists. Sign in instead.';
  if (/password should be/i.test(message)) return 'Choose a password of at least 8 characters.';
  if (/captcha/i.test(message)) return 'Sign-in from the app is blocked by bot protection. Please try again later.';
  if (/network|fetch/i.test(message)) return 'No internet connection. Check your connection and try again.';
  if (/invalid.*(totp|code)|expired/i.test(message)) return 'That code didn’t work. Check the time on your phone and try the newest code.';
  return 'Something went wrong. Please try again.';
}
