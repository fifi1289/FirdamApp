import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Free',
    price: 'CA$0',
    period: 'forever',
    note: null as string | null,
    description: 'Everything you need every day, free for good.',
    features: [
      'Prayer times, adhan reminders & Qibla',
      'Halal places near you, confirmed by families',
      '204 halal recipes with allergy filters',
      'Shared shopping list for two people',
      '1 AI meal plan a month',
    ],
    cta: 'Get started',
    href: '/auth/register',
    highlighted: false,
  },
  {
    name: 'Firdam Family',
    price: 'CA$4.99',
    period: 'month',
    note: 'or CA$39.99 a year · founding families CA$29.99 a year' as string | null,
    description: 'The halal kitchen that runs itself, for everyone at home.',
    features: [
      '8 AI meal plans a month, built from your pantry',
      'Portions sized for adults and children',
      'Scan receipts straight into your pantry',
      'Your whole household — up to 8 people',
      'Ramadan meal mode, budget & zakat tools',
      'Ask Firdam, the AI helper',
    ],
    cta: 'Start 14-day free trial',
    href: '/auth/register',
    highlighted: true,
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
            Simple pricing for every family
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Start free. One low price unlocks the full kitchen for your whole household.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
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
              {tier.note && <p className="mt-1 text-xs text-muted-foreground">{tier.note}</p>}

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
