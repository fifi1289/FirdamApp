'use client';

import Link from 'next/link';
import { Check, Crown, Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LIMIT_LABELS, PLAN_LIMITS, type LimitKey } from '@/lib/plan/plan';

const PREMIUM_PERKS = [
  'Unlimited AI halal meal plans',
  'Unlimited trips, habits, goals and recipes',
  'Ramadan, zakat and savings tools without limits',
  'Priority support',
];

export function UpgradeDialog({
  open,
  onOpenChange,
  limitKey,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitKey?: LimitKey;
  title?: string;
  description?: string;
}) {
  const freeLimit = limitKey ? PLAN_LIMITS.free[limitKey] : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="bg-girih bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid px-6 pb-6 pt-7 text-brand-linen">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gold text-brand-espresso">
            <Crown className="h-5 w-5" />
          </span>
          <DialogHeader className="mt-4 space-y-1.5 text-left">
            <DialogTitle className="font-display text-xl text-brand-linen">
              {title ?? 'Unlock more with Premium'}
            </DialogTitle>
            <DialogDescription className="text-brand-linen/80">
              {description ??
                (limitKey && freeLimit !== null
                  ? `The Free plan includes ${freeLimit} ${LIMIT_LABELS[limitKey]}. Upgrade for unlimited.`
                  : 'Get the full Firdam experience for your family.')}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-5 p-6">
          <ul className="space-y-2.5">
            {PREMIUM_PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage" />
                {p}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/dashboard/upgrade">
                <Sparkles className="mr-2 h-4 w-4" />
                Start 14-day free trial
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Not now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a5a30] dark:text-brand-gold',
        className
      )}
    >
      <Crown className="h-3 w-3" />
      Premium
    </span>
  );
}

/** Small "x of y used" line shown under lists on the Free plan. */
export function UsageNote({
  used,
  limit,
  label,
  onUpgrade,
}: {
  used: number;
  limit: number;
  label: string;
  onUpgrade: () => void;
}) {
  if (!Number.isFinite(limit)) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {Math.min(used, limit)} of {limit} {label} on the Free plan ·{' '}
      <button type="button" onClick={onUpgrade} className="font-medium text-primary hover:underline">
        Go unlimited
      </button>
    </p>
  );
}
