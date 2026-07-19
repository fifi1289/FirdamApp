'use client';

import * as React from 'react';
import type { User } from '@supabase/supabase-js';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { signOut as signOutService } from '@/lib/auth/auth-service';

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      // onAuthStateChange runs synchronously; wrap async work to avoid deadlock.
      (async () => {
        setUser(session?.user ?? null);
        setLoading(false);
      })();
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
