'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
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
 * (Google Authenticator, Microsoft Authenticator, 1Password…), using Supabase MFA.
 */
export function TwoFactorCard() {
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined);
  const [enrol, setEnrol] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await createSupabaseBrowserClient().auth.mfa.listFactors();
    if (error) {
      setFactorId(null);
      return;
    }
    setFactorId(data.totp.find((f) => f.status === 'verified')?.id ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const start = async () => {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // Remove any half-finished setup first.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.all ?? []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Firdam ${new Date().toISOString().slice(0, 10)}` });
      if (error) throw error;
      setEnrol({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode('');
    } catch (err) {
      toast.error('Could not start setup', {
        description: err instanceof Error ? err.message : 'Two-step verification may need to be enabled in Supabase (Authentication → Multi-Factor).',
      });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!enrol || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      const { error } = await createSupabaseBrowserClient().auth.mfa.challengeAndVerify({ factorId: enrol.factorId, code });
      if (error) throw error;
      setEnrol(null);
      toast.success('Two-step verification is on');
      load();
    } catch {
      toast.error('That code didn’t work — try the newest code in your app.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!factorId) return;
    if (!window.confirm('Turn off two-step verification? Your account will only be protected by your password.')) return;
    setBusy(true);
    try {
      const { error } = await createSupabaseBrowserClient().auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success('Two-step verification is off');
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
          Protect your family’s information with a code from an authenticator app (such as Google Authenticator or Microsoft
          Authenticator) each time you sign in on a new device.
        </p>
        {factorId === undefined ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : factorId ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-sage/15 px-3 py-1 text-sm font-medium text-brand-sage">
              <Check className="h-4 w-4" /> On
            </span>
            <Button variant="ghost" size="sm" onClick={turnOff} disabled={busy}>
              <ShieldOff className="mr-2 h-4 w-4" /> Turn off
            </Button>
          </div>
        ) : enrol ? (
          <div className="space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
              <li>Open your authenticator app and scan this QR code.</li>
              <li>Type the 6-digit code it shows.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrol.qr} alt="QR code for your authenticator app" className="h-44 w-44 rounded-xl border border-border bg-white p-2" />
            <p className="text-xs text-muted-foreground">
              Can’t scan? Enter this key instead: <code className="break-all rounded bg-muted px-1">{enrol.secret}</code>
            </p>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-36 tracking-[0.3em]"
                aria-label="Code from your app"
              />
              <Button onClick={confirm} disabled={busy || code.length !== 6}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Turn on
              </Button>
              <Button variant="ghost" onClick={() => setEnrol(null)} disabled={busy}>
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
