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
    description: 'Everything you need to begin.',
    features: [
      'Prayer times, Qibla & monthly timetable',
      'Halal Places finder',
      'Daily duas & Quran tracker',
      'Family calendar',
      'Basic meal and grocery planning',
    ],
    cta: 'Get started',
    href: '/auth/register',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: '$19.99',
    period: 'month',
    description: 'For individuals and couples who want it all.',
    features: [
      'AI Family Companion & AI halal meal plans',
      'Budget, savings goals & zakat calculator',
      'Ramadan planner & tracker',
      'Reminders for prayers and events',
      'Priority support',
    ],
    cta: 'Start Premium',
    href: '/auth/register',
    highlighted: true,
  },
  {
    name: 'Family+',
    price: '$39.99',
    period: 'month',
    description: 'One home for the whole household.',
    features: [
      'Everything in Premium',
      'Shared family workspace',
      'Multiple family profiles',
      'Shared calendars and grocery lists',
      'Advanced collaboration',
    ],
    cta: 'Choose Family+',
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
            Simple pricing for every family
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Start free. Upgrade when your family is ready for more.
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
