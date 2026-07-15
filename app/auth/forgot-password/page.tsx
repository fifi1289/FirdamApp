'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  requestPasswordReset,
  getAuthErrorMessage,
} from '@/lib/auth/auth-service';
import { emailSchema } from '@/lib/auth/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await requestPasswordReset(supabase, email);
      setSent(true);
      toast.success('Reset link sent. Check your inbox.');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      description="Enter your email and we'll send you a link to reset your password."
    >
      {sent ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, you&apos;ll
              receive a reset link shortly. Click it to choose a new password.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
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
                aria-invalid={!!error}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link…
              </>
            ) : (
              <>
                Send reset link
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
