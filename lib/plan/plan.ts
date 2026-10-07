'use client';

import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PlanId, Subscription } from '@/types/database';

/**
 * What each plan allows. `Infinity` means no plan limit; paid plans still have
 * fair-use caps enforced server-side (see FAIR_USE and supabase/functions/_shared/plan.ts).
 */
export const PLAN_LIMITS = {
  free: {
    companionMessagesPerMonth: 20,
    aiMealPlansPerMonth: 2,
    customRecipes: 3,
    trips: 1,
    habits: 3,
    savingsGoals: 1,
    learningGoals: 2,
    shoppingLists: 2,
  },
  premium: {
    companionMessagesPerMonth: Infinity,
    aiMealPlansPerMonth: Infinity,
    customRecipes: Infinity,
    trips: Infinity,
    habits: Infinity,
    savingsGoals: Infinity,
    learningGoals: Infinity,
    shoppingLists: Infinity,
  },
  family: {
    companionMessagesPerMonth: Infinity,
    aiMealPlansPerMonth: Infinity,
    customRecipes: Infinity,
    trips: Infinity,
    habits: Infinity,
    savingsGoals: Infinity,
    learningGoals: Infinity,
    shoppingLists: Infinity,
  },
} as const;

/** Fair-use caps on paid plans (AI costs real money per use). */
export const FAIR_USE = {
  companionMessagesPerDay: 50,
  aiMealPlansPerMonth: 30,
} as const;

export type LimitKey = keyof (typeof PLAN_LIMITS)['free'];

export const LIMIT_LABELS: Record<LimitKey, string> = {
  companionMessagesPerMonth: 'Companion messages a month',
  aiMealPlansPerMonth: 'AI meal plans per month',
  customRecipes: 'your own recipes',
  trips: 'planned trips',
  habits: 'tracked habits',
  savingsGoals: 'savings goals',
  learningGoals: 'learning goals',
  shoppingLists: 'shopping lists',
};

export const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Free',
  premium: 'Premium',
  family: 'Family+',
};

export interface PlanState {
  plan: PlanId;
  subscription: Subscription | null;
  loading: boolean;
  isPaid: boolean;
  limit: (key: LimitKey) => number;
  /** True when `count` existing items already use up the allowance. */
  atLimit: (key: LimitKey, count: number) => boolean;
}

let cache: Promise<Subscription | null> | null = null;

/** Clears the cached plan (e.g. after returning from checkout). */
export function refreshPlan() {
  cache = null;
}

function loadSubscription(): Promise<Subscription | null> {
  cache ??= (async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      // Table not migrated yet or offline — treat as Free.
      console.warn('Could not load subscription:', error.message);
      return null;
    }
    return data;
  })();
  return cache;
}

function effectivePlan(sub: Subscription | null): PlanId {
  if (!sub) return 'free';
  const live = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
  return live && notExpired ? sub.plan : 'free';
}

export function usePlan(): PlanState {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSubscription().then((s) => {
      if (cancelled) return;
      setSubscription(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const plan = effectivePlan(subscription);
  const limit = (key: LimitKey) => PLAN_LIMITS[plan][key];
  return {
    plan,
    subscription,
    loading,
    isPaid: plan !== 'free',
    limit,
    // While loading, never block — the check runs again once the plan is known.
    atLimit: (key, count) => !loading && count >= limit(key),
  };
}
