'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Loader2, ShoppingBasket, Sparkles, UtensilsCrossed } from 'lucide-react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { recordReferralClick } from '@/features/earn/earn-client';
import { tr } from '@/lib/i18n';

const PERKS = [
  { icon: UtensilsCrossed, text: 'Halal recipes and an AI chef that plans your week' },
  { icon: ShoppingBasket, text: 'A shared shopping list, pantry and receipt scanning' },
  { icon: CalendarDays, text: 'Prayer times, Quran, Ramadan and the family calendar' },
];

/** /join/<code>: another family's invite link. */
export function JoinReferral({ code }: { code: string }) {
  const [state, setState] = useState<'checking' | 'ok' | 'plain'>('checking');

  useEffect(() => {
    recordReferralClick(code)
      .then((ok) => setState(ok ? 'ok' : 'plain'))
      .catch(() => setState('plain'));
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-7 text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-semibold text-foreground">
              {state === 'ok' ? tr('A Firdam family invited you') : tr('Welcome to Firdam')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {tr('Firdam brings your family’s meals, faith and home together in one place. It’s free to start.')}
            </p>
            <ul className="mt-6 space-y-3 text-start text-sm">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{tr(text)}</span>
                </li>
              ))}
            </ul>
            {state === 'checking' ? (
              <p className="mt-7 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {tr('One moment…')}
              </p>
            ) : (
              <div className="mt-7 space-y-3">
                <Button asChild className="w-full">
                  <Link href="/auth/register">{tr('Create my free account')}</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  {tr('Already have an account?')} <Link href="/auth/login" className="font-medium text-primary hover:underline">{tr('Sign in')}</Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
