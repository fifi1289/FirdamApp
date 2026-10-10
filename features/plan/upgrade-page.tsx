'use client';

import { useEffect, useState } from 'react';
import { Check, Crown, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';

type Tier = 'free' | 'family';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase/functions';
import { PLAN_NAMES, PRICES, refreshPlan, usePlan } from '@/lib/plan/plan';
import { cn } from '@/lib/utils';

type Interval = 'month' | 'year';

const FEATURES: { label: string; free: string | boolean; family: string | boolean }[] = [
  { label: 'Prayer times, Qibla & monthly timetable', free: true, family: true },
  { label: 'Halal Places finder & reviews', free: true, family: true },
  { label: 'Recipe library with allergy filters', free: true, family: true },
  { label: 'Quran & duas, Ramadan tracker', free: true, family: true },
  { label: '“What can I cook?” from your pantry', free: true, family: true },
  { label: 'Meal plans from the recipe library', free: 'Unlimited', family: 'Unlimited' },
  { label: 'Shared household', free: '2 people', family: 'Up to 8 people' },
  { label: 'AI meal plans from your pantry (3, 5 or 7 days)', free: '1 a month', family: '8 a month' },
  { label: 'Scan receipts into the pantry', free: false, family: '30 a month' },
  { label: 'Ask Firdam (AI helper)', free: false, family: '20 messages a day' },
  { label: 'Your own recipes', free: '3', family: 'Unlimited' },
  { label: 'Shopping lists', free: '2', family: 'Unlimited' },
  { label: 'Savings goals (Hajj, Eid…)', free: '1', family: 'Unlimited' },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-brand-sage" />;
  if (value === false) return <span className="text-muted-foreground/50">—</span>;
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}

export function UpgradePage() {
  const { plan, subscription, loading } = usePlan();
  const [interval, setBillingInterval] = useState<Interval>('month');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('checkout');
    if (status === 'success') {
      refreshPlan();
      toast.success('Welcome to Firdam Family! Your trial has started.', {
        description: 'It can take a few seconds for your plan to update.',
      });
    } else if (status === 'cancelled') {
      toast.message('Checkout cancelled — you have not been charged.');
    }
  }, []);

  const go = async (action: 'checkout' | 'portal', target?: 'family') => {
    setBusy(action === 'portal' ? 'portal' : target ?? null);
    try {
      const { url } = await callEdgeFunction<{ url: string }>('billing', undefined, {
        body: { action, plan: target, interval, returnPath: '/dashboard/upgrade' },
      });
      window.location.href = url;
    } catch (err) {
      setBusy(null);
      if (err instanceof EdgeFunctionError && err.status === 501) {
        toast.error('Payments are not switched on yet', {
          description: 'The Firdam team is finishing billing setup. Please try again soon.',
        });
        return;
      }
      toast.error('Could not open checkout', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const tiers: { id: Tier; title: string; icon: typeof Crown; blurb: string; highlighted?: boolean }[] = [
    { id: 'free', title: 'Free', icon: ShieldCheck, blurb: 'Prayer times, halal places, recipes and a shared list for two.' },
    { id: 'family', title: 'Firdam Family', icon: Users, blurb: 'The halal kitchen that plans, shops and tracks the pantry — for everyone at home.', highlighted: true },
  ];
  const paid = plan !== 'free';

  return (
    <AppShell>
      <PageHeader
        title="Plans"
        description="One low price for your whole household. Firdam Family starts with a 14-day free trial."
      >
        {plan !== 'free' && (
          <Button variant="outline" size="sm" onClick={() => go('portal')} disabled={busy === 'portal'}>
            {busy === 'portal' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Manage billing
          </Button>
        )}
      </PageHeader>

      {!loading && plan !== 'free' && (
        <Card className="mb-6 border-brand-gold/40 bg-brand-gold/10">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <Crown className="h-5 w-5 text-[#7a5a30] dark:text-brand-gold" />
            <span className="font-medium text-foreground">
              You&apos;re on {PLAN_NAMES[plan]}
              {subscription?.status === 'trialing' ? ' (free trial)' : ''}.
            </span>
            {subscription?.current_period_end && (
              <span className="text-muted-foreground">
                {subscription.cancel_at_period_end ? 'Ends' : 'Renews'} on{' '}
                {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {(['month', 'year'] as Interval[]).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setBillingInterval(i)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                interval === i ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {i === 'month' ? 'Monthly' : `Yearly · ${PRICES.year.saving.toLowerCase()}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
        {tiers.map((t) => {
          const Icon = t.icon;
          const current = t.id === 'free' ? !paid : paid;
          const price = t.id === 'free' ? { amount: 'CA$0', note: 'forever' } : PRICES[interval];
          return (
            <Card
              key={t.id}
              className={cn(
                'relative flex flex-col',
                t.highlighted && 'border-primary/50 shadow-lg lg:-translate-y-2'
              )}
            >
              {t.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="h-3 w-3" /> Most popular
                </Badge>
              )}
              <CardContent className="flex flex-1 flex-col p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold text-foreground">{t.title}</h2>
                <p className="text-sm text-muted-foreground">{t.blurb}</p>
                <p className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground">
                  {price.amount}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">{price.note}</span>
                </p>
                {t.id === 'family' && (
                  <p className="mt-2 text-xs font-medium text-brand-sage">{PRICES.founding}</p>
                )}
                <div className="mt-auto pt-6">
                  {current ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : t.id === 'free' ? (
                    plan !== 'free' ? (
                      <Button variant="outline" className="w-full" onClick={() => go('portal')}>
                        Switch in billing
                      </Button>
                    ) : null
                  ) : (
                    <Button
                      className="w-full"
                      variant={t.highlighted ? 'default' : 'outline'}
                      onClick={() => (plan === 'free' ? go('checkout', 'family') : go('portal'))}
                      disabled={busy !== null}
                    >
                      {busy === t.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {plan === 'free' ? 'Start 14-day free trial' : 'Manage billing'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Compare plans</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Free</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Firdam Family</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 text-foreground">{f.label}</td>
                  <td className="px-4 py-2.5 text-center"><Cell value={f.free} /></td>
                  <td className="px-4 py-2.5 text-center"><Cell value={f.family} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Prices in Canadian dollars. Payments are handled securely by Stripe. Cancel anytime from “Manage billing”.
      </p>
    </AppShell>
  );
}
