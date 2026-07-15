import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to start organizing your life.',
    features: [
      'Up to 4 active modules',
      'Basic reminders',
      'Light & dark themes',
      '1 GB storage',
    ],
    cta: 'Get started',
    href: '/auth/register',
    highlighted: false,
  },
  {
    name: 'Plus',
    price: '$6',
    period: 'per month',
    description: 'Unlock every module and power features.',
    features: [
      'All modules unlocked',
      'Smart reminders & routines',
      'Advanced insights & exports',
      'Unlimited storage',
      'Priority support',
    ],
    cta: 'Start 14-day trial',
    href: '/auth/register',
    highlighted: true,
  },
  {
    name: 'Family',
    price: '$12',
    period: 'per month',
    description: 'Share Firdam with the people you love.',
    features: [
      'Everything in Plus',
      'Up to 6 members',
      'Shared calendars & lists',
      'Family roles & permissions',
    ],
    cta: 'Choose Family',
    href: '/auth/register',
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border/60 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Simple pricing that grows with you
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Start free. Upgrade only when you need more.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-card p-7 transition-shadow',
                tier.highlighted
                  ? 'border-primary/50 shadow-lg lg:-translate-y-2'
                  : 'border-border/60 hover:shadow-md'
              )}
            >
              {tier.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Most popular
                </Badge>
              )}

              <h3 className="text-lg font-semibold text-foreground">
                {tier.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {tier.description}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight text-foreground">
                  {tier.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{tier.period}
                </span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="mt-7 w-full"
                variant={tier.highlighted ? 'default' : 'outline'}
              >
                <Link href={tier.href}>{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
