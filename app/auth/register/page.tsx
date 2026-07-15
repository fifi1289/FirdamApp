'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await signUp(supabase, { email, password, firstName, lastName });
      router.push('/auth/verify-email');
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      description="Start organizing your life — free, no credit card required."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="firstName"
                type="text"
                placeholder="Sami"
                className="pl-9"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={!!errors.firstName}
              />
            </div>
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Khan"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              aria-invalid={!!errors.lastName}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
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
          <Label htmlFor="password">Password</Label>
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

        <label className="flex items-start gap-2.5 pt-1">
          <Checkbox
            id="terms"
            className="mt-0.5"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          <span className="text-sm text-muted-foreground">
            I agree to the{' '}
            <Link href="#" className="font-medium text-primary hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="#" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs text-destructive">{errors.terms}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      <Button variant="outline" className="w-full" size="lg" disabled>
        Sign up with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>

      <div className="mt-4 rounded-lg bg-muted/40 p-3 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3 w-3 text-primary" />
          We&apos;ll send a verification link to your email after signup.
        </span>
      </div>
    </AuthShell>
  );
}
