'use client';

import Link from 'next/link';
import { GraduationCap, Loader2, PenLine, Store, Users } from 'lucide-react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEarnVisibleState } from '@/features/earn/earn-client';
import { tr } from '@/lib/i18n';

const DOORS = [
  {
    icon: Users,
    title: 'Ambassadors',
    who: 'Anyone with a Firdam account',
    text: 'Share your personal invite link with families you know. Each family that joins and uses Firdam on 7 different days in its first month earns you a free month of Firdam Family.',
    action: { label: 'Get my invite link', href: '/earn/ambassador' },
  },
  {
    icon: PenLine,
    title: 'Creators',
    who: 'Cooks, teachers and parents with ideas to share',
    text: 'Publish halal recipes, meal plans, lessons and family activities. Creators who build something families really use will share in what those families pay Firdam.',
    action: null,
  },
  {
    icon: Store,
    title: 'Partners and teachers',
    who: 'Muslim-owned shops, services and teachers',
    text: 'List your business for families to find, and later sell courses and lessons through Firdam.',
    action: { label: 'Become a partner', href: '/partners' },
  },
];

/** /earn: the three ways to earn with Firdam. Hidden ("coming soon") until the owner opens it. */
export function EarnLanding() {
  const visible = useEarnVisibleState();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {visible === null ? (
          <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {tr('One moment…')}
          </p>
        ) : !visible ? (
          <section className="container max-w-xl py-24 text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GraduationCap className="h-7 w-7" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold text-foreground">{tr('Earn with Firdam')}</h1>
            <p className="mt-3 text-muted-foreground">{tr('Coming soon, in shaa Allah.')}</p>
          </section>
        ) : (
          <>
            <section className="border-b border-border/60 py-14 md:py-20">
              <div className="container max-w-4xl">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">{tr('Earn with Firdam')}</p>
                <h1 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-5xl">
                  {tr('Help Muslim families, and be rewarded for it')}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  {tr('Firdam grows through families who recommend it and people who make it better. There are three ways to take part. Choose the one that fits you.')}
                </p>
              </div>
            </section>
            <section className="container max-w-5xl py-12">
              <div className="grid gap-5 md:grid-cols-3">
                {DOORS.map(({ icon: Icon, title, who, text, action }) => (
                  <Card key={title} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col p-6">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h2 className="mt-4 text-lg font-semibold text-foreground">{tr(title)}</h2>
                      <p className="text-xs font-medium text-muted-foreground">{tr(who)}</p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{tr(text)}</p>
                      {action ? (
                        <Button asChild className="mt-5 w-full">
                          <Link href={action.href}>{tr(action.label)}</Link>
                        </Button>
                      ) : (
                        <Button className="mt-5 w-full" variant="outline" disabled>
                          {tr('Coming soon')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="mt-8 text-center text-sm text-muted-foreground">
                {tr('Read the')}{' '}
                <Link href="/earn/terms/ambassador" className="font-medium text-primary hover:underline">
                  {tr('Ambassador Terms')}
                </Link>
                .
              </p>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
