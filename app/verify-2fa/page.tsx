'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function Verify2faPage() {
  return (
    <React.Suspense fallback={null}>
      <Verify2fa />
    </React.Suspense>
  );
}

/** Second step of sign-in for people who turned on two-step verification. */
function Verify2fa() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const redirect = params.get('redirect') || '/dashboard';
  const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const factor = factors.totp.find((f) => f.status === 'verified');
      if (!factor) {
        router.replace(safeRedirect);
        return;
      }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: clean });
      if (error) throw error;
      await supabase.auth.getSession();
      router.replace(safeRedirect);
    } catch {
      toast.error('That code didn’t work. Check the time on your phone and try the newest code.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <AuthShell title="Two-step verification" description="Enter the 6-digit code from your authenticator app.">
      <form className="space-y-4" onSubmit={verify}>
        <div className="flex justify-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
        </div>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123 456"
          className="text-center text-lg tracking-[0.3em]"
          maxLength={7}
          autoFocus
          aria-label="6-digit code"
        />
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Lost your phone? Email the Firdam team from your account’s email address to recover access.{' '}
          <button type="button" onClick={signOut} className="text-primary hover:underline">
            Sign out
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
