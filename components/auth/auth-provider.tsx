'use client';

import * as React from 'react';
import type { User } from '@supabase/supabase-js';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { signOut as signOutService } from '@/lib/auth/auth-service';

/**
 * Centralized authentication provider.
 *
 * Exposes the current Supabase user, a loading flag for the initial
 * session check, an `authenticated` boolean, and a `logout` action.
 * Components read from here instead of each calling Supabase directly,
 * keeping auth state in one place.
 */

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
  authenticated: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    // Read the session once on mount so we don't block on auth state events.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to future auth changes (login / logout / token refresh).
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const logout = React.useCallback(async () => {
    await signOutService(supabase);
    setUser(null);
  }, [supabase]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, loading, authenticated: !!user, logout }),
    [user, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}
