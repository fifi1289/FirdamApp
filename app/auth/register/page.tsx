import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Check } from 'lucide-react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

export const metadata = {
  title: 'Create account',
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Start organizing your life — free, no credit card required."
    >
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              className="pl-9"
              autoComplete="name"
              required
            />
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
            />
          </div>
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
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 pt-1">
          <Checkbox id="terms" className="mt-0.5" />
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

        <Button type="submit" className="w-full" size="lg">
          Create account
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
          Auth business logic is intentionally not wired yet.
        </span>
      </div>
    </AuthShell>
  );
}
