'use client';

import Link from 'next/link';
import { MailCheck, ArrowRight } from 'lucide-react';

import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" aria-label="Back to home">
            <Logo noLink height={40} />
          </Link>
          <ThemeToggle />
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-8 w-8 text-primary" />
            </span>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Check your inbox
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We&apos;ve sent a verification link to your email address.
              Click the link to confirm your account — you&apos;ll be able
              to sign in once your email is verified.
            </p>

            <div className="mt-6 rounded-lg bg-muted/40 p-4 text-left text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Didn&apos;t get the email?</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Check your spam or junk folder.</li>
                <li>Make sure you entered the correct email address.</li>
                <li>Wait a minute — it can take a moment to arrive.</li>
              </ul>
            </div>

            <Button asChild className="mt-6 w-full" size="lg">
              <Link href="/auth/login">
                Back to sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Firdam. Everything that matters. One place.
        </p>
      </div>
    </div>
  );
}
