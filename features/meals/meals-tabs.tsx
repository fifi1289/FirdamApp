'use client';

import Link from 'next/link';

import { tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Meal plan sections: family meals and the children's school lunchboxes (same as the app). */
export function MealsTabs({ active }: { active: 'meals' | 'lunchbox' }) {
  const tabs = [
    { key: 'meals', href: '/dashboard/meals', label: tr('Family meals') },
    { key: 'lunchbox', href: '/dashboard/lunchbox', label: tr('School lunchboxes') },
  ] as const;
  return (
    <nav className="inline-flex rounded-xl border border-border bg-card p-1" aria-label={tr('Meal plan')}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? 'page' : undefined}
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
            active === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
