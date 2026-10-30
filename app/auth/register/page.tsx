'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Turnstile, TURNSTILE_SITE_KEY } from '@/components/auth/turnstile';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { signUp, getAuthErrorMessage } from '@/lib/auth/auth-service';
import {
  emailSchema,
  passwordSchema,
  passwordStrength,
  STRENGTH_LABELS,
} from '@/lib/auth/validation';
import { tr, trn } from '@/lib/i18n';

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [captcha, setCaptcha] = React.useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = React.useState(0);

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string> = {};

    if (!firstName.trim()) fieldErrors.firstName = 'First name is required.';
    if (!lastName.trim()) fieldErrors.lastName = 'Last name is required.';

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) fieldErrors.email = emailResult.error.issues[0].message;

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) fieldErrors.password = passwordResult.error.issues[0].message;

    if (confirm !== password) fieldErrors.confirm = 'Passwords do not match.';

    if (!agreed) fieldErrors.terms = 'Please accept the Terms to continue.';

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    if (TURNSTILE_SITE_KEY && !captcha) {
      toast.message(tr('One moment — we’re checking you’re not a bot.'));
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await signUp(supabase, { email, password, firstName, lastName, captchaToken: captcha });
      router.push('/auth/verify-email');
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
      setCaptchaReset((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title={tr('Create your account')}
      description={tr('Start organizing your life — free, no credit card required.')}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">{tr('First name')}</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="firstName"
                type="text"
                placeholder={tr('Sami')}
                className="pl-9"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={!!errors.firstName}
              />
            </div>
            {errors.firstName && (
              <p className="text-xs text-destructive">{trn(errors.firstName)}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{tr('Last name')}</Label>
            <Input
              id="lastName"
              type="text"
              placeholder={tr('Khan')}
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              aria-invalid={!!errors.lastName}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{trn(errors.lastName)}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{tr('Email')}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder={tr('you@example.com')}
              className="pl-9"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{tr('Password')}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder={tr('At least 8 characters')}
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
                {trn(STRENGTH_LABELS[strength])}
              </span>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-destructive">{trn(errors.password)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">{tr('Confirm password')}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm"
              type="password"
              placeholder={tr('Re-enter your password')}
              className="pl-9"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={!!errors.confirm}
            />
          </div>
          {errors.confirm && (
            <p className="text-xs text-destructive">{trn(errors.confirm)}</p>
          )}
        </div>

        <label className="flex items-start gap-2.5 pt-1">
          <Checkbox
            id="terms"
            className="mt-0.5"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          <span className="text-sm text-muted-foreground">
            {tr('I’m 18 or older and I agree to the')}{' '}
            <Link href="/terms" target="_blank" className="font-medium text-primary hover:underline">
              {tr('Terms of Use')}
            </Link>{' '}
            {tr('and')}{' '}
            <Link href="/privacy" target="_blank" className="font-medium text-primary hover:underline">
              {tr('Privacy Policy')}
            </Link>
            .
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs text-destructive">{trn(errors.terms)}</p>
        )}

        <Turnstile onToken={setCaptcha} resetKey={captchaReset} />

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tr('Creating account…')}
            </>
          ) : (
            <>
              {tr('Create account')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {tr('or')}
        </span>
        <Separator className="flex-1" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        size="lg"
        onClick={handleGoogleSignUp}
        disabled={loading || googleLoading}
      >
        {googleLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tr('Connecting…')}
          </>
        ) : (
          tr('Sign up with Google')
        )}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {tr('Already have an account?')}{' '}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline"
        >
          {tr('Sign in')}
        </Link>
      </p>

      <div className="mt-4 rounded-lg bg-muted/40 p-3 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3 w-3 text-primary" />
          {tr('We\'ll send a verification link to your email after signup.')}
        </span>
      </div>
    </AuthShell>
  );
}
