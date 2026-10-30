'use client';

import Link from 'next/link';
import { MailCheck, ArrowRight } from 'lucide-react';

import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { tr } from '@/lib/i18n';

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" aria-label={tr('Back to home')}>
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
              {tr('Check your inbox')}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {tr('We\'ve sent a verification link to your email address. Click the link to confirm your account — you\'ll be able to sign in once your email is verified.')}
            </p>

            <div className="mt-6 rounded-lg bg-muted/40 p-4 text-left text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{tr('Didn\'t get the email?')}</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>{tr('Check your spam or junk folder.')}</li>
                <li>{tr('Make sure you entered the correct email address.')}</li>
                <li>{tr('Wait a minute — it can take a moment to arrive.')}</li>
              </ul>
            </div>

            <Button asChild className="mt-6 w-full" size="lg">
              <Link href="/auth/login">
                {tr('Back to sign in')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {tr('Firdam. One home for your Muslim life.')}
        </p>
      </div>
    </div>
  );
}
