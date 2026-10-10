'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface Enrolment {
  factorId: string;
  qr: string;
  secret: string;
}

/**
 * Settings → Account: two-step verification with an authenticator app
 * (Google Authenticator, Microsoft Authenticator, 1Password…).
 */
export function TwoFactorCard() {
  const supabase = createSupabaseBrowserClient();
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactorId(data?.totp.find((f) => f.status === 'verified')?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const start = async () => {
    setBusy(true);
    try {
      // Clear any half-finished setup first.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.all ?? []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Firdam ${new Date().toISOString().slice(0, 10)}` });
      if (error) throw error;
      setEnrolment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode('');
    } catch (err) {
      toast.error('Could not start setup', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!enrolment) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolment.factorId, code: code.replace(/\D/g, '') });
      if (error) throw error;
      setEnrolment(null);
      toast.success('Two-step verification is on. You’ll be asked for a code when you sign in.');
      load();
    } catch {
      toast.error('That code didn’t work — try the newest one in your app.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!factorId) return;
    if (!window.confirm('Turn off two-step verification? Your account will be protected by your password only.')) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await supabase.auth.refreshSession();
      toast.success('Two-step verification is off.');
      load();
    } catch (err) {
      toast.error('Could not turn it off', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          Two-step verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Protect your family’s information with a code from an authenticator app (like Google Authenticator or
          Microsoft Authenticator) as well as your password. Recommended if you track your savings, gold or zakat.
        </p>

        {factorId === undefined ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </p>
        ) : factorId ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-sage/15 px-3 py-1 text-sm font-medium text-brand-sage">
              <Check className="h-4 w-4" /> On
            </span>
            <Button variant="outline" size="sm" onClick={turnOff} disabled={busy}>
              <ShieldOff className="mr-2 h-4 w-4" /> Turn off
            </Button>
          </div>
        ) : enrolment ? (
          <div className="space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
              <li>Open your authenticator app and scan this code.</li>
              <li>Type the 6-digit code it shows.</li>
            </ol>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrolment.qr} alt="QR code for your authenticator app" className="h-40 w-40" />
              <div className="text-xs text-muted-foreground">
                <p className="flex items-center gap-1 font-medium text-foreground">
                  <KeyRound className="h-3.5 w-3.5" /> Can’t scan? Enter this key:
                </p>
                <code className="mt-1 block break-all rounded bg-muted px-2 py-1 text-foreground">{enrolment.secret}</code>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={7}
                className="max-w-[10rem] text-center tracking-widest"
                aria-label="6-digit code"
              />
              <Button onClick={confirm} disabled={busy || code.replace(/\D/g, '').length !== 6}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Turn on
              </Button>
              <Button variant="ghost" onClick={() => setEnrolment(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={start} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Set up two-step verification
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
