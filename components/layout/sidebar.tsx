'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/logo';
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
];

const groupedNav = MODULE_GROUPS.map((group) => ({
  title: group,
  items: lifeModules
    .filter((m) => m.group === group)
    .map<NavItem>((m) => ({
      label: m.name,
      href: m.href,
      icon: moduleIconMap[m.icon],
      badge: m.status === 'beta' ? 'Beta' : undefined,
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
        <div className="bg-girih rounded-xl bg-gradient-to-br from-primary/10 to-brand-light/10 p-3">
          <p className="text-sm font-medium text-foreground">
            One home for your Muslim life
          </p>
          <p
            className="mt-1 font-arabic text-sm text-primary"
            lang="ar"
            dir="rtl"
          >
            بِسْمِ ٱللَّٰهِ
          </p>
        </div>
      </div>
    </aside>
  );
}
