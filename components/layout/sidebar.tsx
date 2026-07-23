'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarRange,
  Moon,
  Users,
  Wallet,
  Plane,
  ShoppingCart,
  HeartPulse,
  Handshake,
  BookOpen,
  Archive,
  Utensils,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/logo';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Planner', href: '/dashboard/planner', icon: CalendarRange },
];

const moduleNav: NavItem[] = [
  { label: 'Family', href: '/dashboard/family', icon: Users },
  { label: 'Pantry', href: '/dashboard/pantry', icon: Archive, badge: 'Beta' },
  { label: 'Meals', href: '/dashboard/meals', icon: Utensils },
  { label: 'Prayer Times', href: '/dashboard/prayer-times', icon: Moon },
  { label: 'Finance', href: '/dashboard/finance', icon: Wallet },
  { label: 'Travel', href: '/dashboard/travel', icon: Plane },
  { label: 'Shopping', href: '/dashboard/shopping', icon: ShoppingCart },
  { label: 'Health', href: '/dashboard/health', icon: HeartPulse },
  { label: 'Community', href: '/dashboard/community', icon: Handshake, badge: 'Beta' },
  { label: 'Learning', href: '/dashboard/learning', icon: BookOpen, badge: 'Beta' },
];

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

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card/40 backdrop-blur-sm">
      <div className="flex h-20 items-center border-b border-border px-5">
        <Logo href="/" height={56} />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <NavSection title="Overview" items={mainNav} />
        <NavSection title="Modules" items={moduleNav} />
        <NavSection title="Account" items={footerNav} />
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-xl bg-gradient-to-br from-primary/10 to-brand-light/10 p-3">
          <p className="text-sm font-medium text-foreground">
            Everything that matters
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            New modules land every month.
          </p>
        </div>
      </div>
    </aside>
  );
}
