'use client';

import { useEffect, useState } from 'react';
import { Check, Crown, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase/functions';
import { PLAN_NAMES, refreshPlan, usePlan } from '@/lib/plan/plan';
import { cn } from '@/lib/utils';
import type { PlanId } from '@/types/database';

type Interval = 'month' | 'year';

const PRICES: Record<Exclude<PlanId, 'free'>, Record<Interval, { amount: string; note: string }>> = {
  premium: {
    month: { amount: '$19.99', note: 'per month' },
    year: { amount: '$199', note: 'per year — 2 months free' },
  },
  family: {
    month: { amount: '$39.99', note: 'per month' },
    year: { amount: '$399', note: 'per year — 2 months free' },
  },
};

const FEATURES: { label: string; free: string | boolean; premium: string | boolean; family: string | boolean }[] = [
  { label: 'Prayer times, Qibla & monthly timetable', free: true, premium: true, family: true },
  { label: 'Halal Places finder & reviews', free: true, premium: true, family: true },
  { label: 'Recipe library & meal planner', free: true, premium: true, family: true },
  { label: 'Quran & duas, Ramadan planner', free: true, premium: true, family: true },
  { label: 'Family calendar, community events', free: true, premium: true, family: true },
  { label: 'AI Family Companion', free: '10 messages a day', premium: 'Unlimited', family: 'Unlimited' },
  { label: 'AI halal meal plans', free: '2 a month', premium: 'Unlimited', family: 'Unlimited' },
  { label: 'Your own recipes', free: '3', premium: 'Unlimited', family: 'Unlimited' },
  { label: 'Trips with destination guides', free: '1', premium: 'Unlimited', family: 'Unlimited' },
  { label: 'Health habits tracked', free: '3', premium: 'Unlimited', family: 'Unlimited' },
  { label: 'Savings goals (Hajj, Eid…)', free: '1', premium: 'Unlimited', family: 'Unlimited' },
  { label: 'Learning goals for the family', free: '2', premium: 'Unlimited', family: 'Unlimited' },
  { label: 'Shopping lists', free: '2', premium: 'Unlimited', family: 'Unlimited' },
  { label: 'Priority support', free: false, premium: true, family: true },
  { label: 'Shared household — up to 8 people', free: false, premium: false, family: true },
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
      toast.success('Welcome to Firdam Premium! Your trial has started.', {
        description: 'It can take a few seconds for your plan to update.',
      });
    } else if (status === 'cancelled') {
      toast.message('Checkout cancelled — you have not been charged.');
    }
  }, []);

  const go = async (action: 'checkout' | 'portal', target?: Exclude<PlanId, 'free'>) => {
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

  const tiers: { id: PlanId; title: string; icon: typeof Crown; blurb: string; highlighted?: boolean }[] = [
    { id: 'free', title: 'Free', icon: ShieldCheck, blurb: 'Everything you need to begin.' },
    { id: 'premium', title: 'Premium', icon: Crown, blurb: 'For individuals and couples who want it all.', highlighted: true },
    { id: 'family', title: 'Family+', icon: Users, blurb: 'One home for the whole household.' },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Plans"
        description="Support Firdam and unlock everything for your family. Every paid plan starts with a 14-day free trial."
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
              {i === 'month' ? 'Monthly' : 'Yearly · save 17%'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {tiers.map((t) => {
          const Icon = t.icon;
          const current = plan === t.id;
          const price = t.id === 'free' ? { amount: '$0', note: 'forever' } : PRICES[t.id][interval];
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
                      onClick={() => (plan === 'free' ? go('checkout', t.id as 'premium' | 'family') : go('portal'))}
                      disabled={busy !== null}
                    >
                      {busy === t.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {plan === 'free' ? 'Start 14-day free trial' : `Switch to ${t.title}`}
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
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Compare plans</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Free</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Premium</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Family+</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 text-foreground">{f.label}</td>
                  <td className="px-4 py-2.5 text-center"><Cell value={f.free} /></td>
                  <td className="px-4 py-2.5 text-center"><Cell value={f.premium} /></td>
                  <td className="px-4 py-2.5 text-center"><Cell value={f.family} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Payments are handled securely by Stripe. Cancel anytime from “Manage billing”. Prices in your
        local currency may vary.
      </p>
    </AppShell>
  );
}
