'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Crown,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/logo';
import { PLAN_NAMES, usePlan } from '@/lib/plan/plan';
import {
  MODULE_GROUPS,
  lifeModules,
  moduleIconMap,
} from '@/features/modules/module-config';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const mainNav: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Companion', href: '/dashboard/companion', icon: Sparkles, badge: 'AI' },
];

const groupedNav = MODULE_GROUPS.map((group) => ({
  title: group,
  items: lifeModules
    .filter((m) => m.group === group)
    .map<NavItem>((m) => ({
      label: m.name,
      href: m.href,
      icon: moduleIconMap[m.icon],
      badge: m.status === 'beta' ? 'Beta' : m.status === 'planned' ? 'Soon' : undefined,
    })),
}));

const footerNav: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Support', href: '/support', icon: LifeBuoy },
];

function NavSection({
  title,
  items,
}: {
  title: string;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
        {title}
      </p>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));

        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            )}
          >
            <Icon
              className={cn(
                'h-4.5 w-4.5 shrink-0 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
              size={18}
            />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function PlanCard() {
  const { plan, loading } = usePlan();
  if (loading) return <div className="h-[74px]" />;
  if (plan !== 'free') {
    return (
      <Link
        href="/dashboard/upgrade"
        className="bg-girih flex items-center gap-3 rounded-xl bg-gradient-to-br from-brand-gold/20 to-brand-light/10 p-3"
      >
        <Crown className="h-5 w-5 text-[#7a5a30] dark:text-brand-gold" />
        <div>
          <p className="text-sm font-medium text-foreground">Firdam {PLAN_NAMES[plan]}</p>
          <p className="text-xs text-muted-foreground">Jazakum Allahu khayran for your support</p>
        </div>
      </Link>
    );
  }
  return (
    <Link
      href="/dashboard/upgrade"
      className="bg-girih block rounded-xl bg-gradient-to-br from-primary/10 to-brand-light/10 p-3 transition-colors hover:from-primary/15"
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Crown className="h-4 w-4 text-primary" />
        Try Premium free
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Unlimited AI meal plans, trips, habits and more — 14 days free.
      </p>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card/40 backdrop-blur-sm">
      <div className="flex h-20 items-center border-b border-border px-5">
        <Logo href="/" height={56} />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        <NavSection title="Overview" items={mainNav} />
        {groupedNav.map((g) => (
          <NavSection key={g.title} title={g.title} items={g.items} />
        ))}
        <NavSection title="Account" items={footerNav} />
      </nav>

      <div className="border-t border-border p-4">
        <PlanCard />
      </div>
    </aside>
  );
}
