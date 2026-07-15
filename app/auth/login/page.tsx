import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export const metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your Firdam account to continue."
    >
      <form className="space-y-4">
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
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="#"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-9"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg">
          Sign in
          <ArrowRight className="ml-2 h-4 w-4" />
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
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link
          href="/auth/register"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>

      <p className="mt-4 rounded-lg bg-muted/40 p-3 text-center text-xs text-muted-foreground">
        Auth business logic is intentionally not wired yet. This is a UI
        placeholder for the next phase.
      </p>
    </AuthShell>
  );
}
