'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  updatePassword,
  getAuthErrorMessage,
} from '@/lib/auth/auth-service';
import {
  passwordSchema,
  passwordStrength,
  STRENGTH_LABELS,
} from '@/lib/auth/validation';

/**
 * Signs in with the link from the reset email. Works whichever device or
 * browser asked for the reset:
 * - `token_hash` links (the recommended email template) are verified here;
 * - `code` links only work in the browser that asked for the reset;
 * - older `#access_token` links are read automatically by Supabase.
 */
async function signInFromResetLink(supabase: ReturnType<typeof createSupabaseBrowserClient>): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get('token_hash');
  const code = params.get('code');
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    if (error) return false;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return false;
    }
  }
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [linkProblem, setLinkProblem] = React.useState(false);

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fieldErrors: { password?: string; confirm?: string } = {};

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      fieldErrors.password = passwordResult.error.issues[0].message;
    }
    if (confirm !== password) {
      fieldErrors.confirm = 'Passwords do not match.';
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // The email link proves who you are. It is only used now, when you press
      // Update, so email scanners that open links early can't use it up.
      const ok = await signInFromResetLink(supabase);
      if (!ok) {
        setLinkProblem(true);
        return;
      }
      await updatePassword(supabase, password);
      // Start fresh: sign in with the new password (and code, if two-step is on).
      await supabase.auth.signOut();
      setDone(true);
      toast.success('Password updated. You can now sign in.');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/aal2|assurance/i.test(message)) {
        toast.error('Two-step verification is on for this account. Sign in with your code first, then change your password in Settings.');
      } else if (/session|expired|invalid|otp|token/i.test(message)) {
        setLinkProblem(true);
      } else {
        toast.error(getAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (linkProblem) {
    return (
      <AuthShell title="This link has expired" description="Reset links work once and expire after an hour.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ask for a new link and use the newest email. If you have several reset emails, older links stop working.
          </p>
          <Button asChild className="w-full" size="lg">
            <Link href="/auth/forgot-password">
              Send me a new link
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" description="Your new password is active.">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">
              You can now sign in with your new password.
            </p>
          </div>
          <Button asChild className="w-full" size="lg" onClick={() => router.push('/auth/login')}>
            <Link href="/auth/login">
              Continue to sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      description="Choose a strong password for your Firdam account."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              className="pl-9"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
            />
          </div>
          {password && (
            <div className="flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={
                      i < strength
                        ? strength <= 1
                          ? 'rounded-full bg-destructive'
                          : strength === 2
                            ? 'rounded-full bg-amber-500'
                            : 'rounded-full bg-emerald-500'
                        : 'rounded-full bg-muted'
                    }
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm"
              type="password"
              placeholder="Re-enter your password"
              className="pl-9"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={!!errors.confirm}
            />
          </div>
          {errors.confirm && (
            <p className="text-xs text-destructive">{errors.confirm}</p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating password…
            </>
          ) : (
            <>
              Update password
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
