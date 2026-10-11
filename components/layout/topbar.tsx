'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Menu } from 'lucide-react';
import { FREE_LAUNCH } from '@/lib/plan/plan';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Logo } from '@/components/brand/logo';
import { useAuth } from '@/components/auth/auth-provider';
import { signOut as signOutService } from '@/lib/auth/auth-service';
import { createSupabaseBrowserClient as getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from '@/hooks/use-toast';
import { lifeModules } from '@/features/modules/module-config';

function buildDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  const meta = user?.user_metadata ?? {};
  const first = meta.first_name ? String(meta.first_name) : '';
  const last = meta.last_name ? String(meta.last_name) : '';
  const full = [first, last].filter(Boolean).join(' ').trim();
  if (full) return full;
  const direct = (meta.full_name ?? meta.name) as string | undefined;
  if (direct) return String(direct);
  if (user?.email) return user.email;
  return 'User';
}

function buildInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const SEARCH_EXTRAS = [
  { name: 'Settings', href: '/settings', keywords: 'preferences theme reminders notifications' },
  { name: 'Profile', href: '/profile', keywords: 'account name' },
  { name: 'Support', href: '/support', keywords: 'help faq contact' },
  { name: 'Family Companion', href: '/dashboard/companion', keywords: 'ai assistant chat ask help' },
  ...(FREE_LAUNCH ? [] : [{ name: 'Plans & billing', href: '/dashboard/upgrade', keywords: 'premium subscription upgrade pricing' }]),
];

function ModuleSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);

  const q = query.trim().toLowerCase();
  const results = q
    ? [
        ...lifeModules.map((m) => ({
          name: m.name,
          href: m.href,
          keywords: `${m.description} ${m.group}`,
        })),
        ...SEARCH_EXTRAS,
      ]
        .filter((r) => `${r.name} ${r.keywords}`.toLowerCase().includes(q))
        .slice(0, 6)
    : [];

  const go = (href: string) => {
    setQuery('');
    setOpen(false);
    router.push(href);
  };

  return (
    <form
      className="relative hidden flex-1 md:block md:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const target = results[active] ?? results[0];
        if (target) go(target.href);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, Math.max(0, results.length - 1)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Search Firdam — e.g. halal, zakat, duas"
        className="pl-9"
        aria-label="Search Firdam"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover p-1 shadow-lg">
          {results.map((r, i) => (
            <li key={r.href}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r.href)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm ${
                  i === active ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/60'
                }`}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const { user, loading, authenticated } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);

  const displayName = buildDisplayName(user);
  const initials = buildInitials(displayName);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      // Await signOut so the SIGNED_OUT event clears session state before we
      // navigate. Only redirect once the server confirms the session is gone.
      await signOutService(supabase);
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not sign out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 print:hidden items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="md:hidden">
        <Logo href="/" height={34} />
      </div>

      <ModuleSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />

        {loading ? null : authenticated ? (
          <>
            <Button variant="ghost" size="icon" aria-label="Reminders" asChild>
              <Link href="/settings?tab=notifications">
                <Bell className="h-5 w-5" />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage alt="" />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="truncate text-sm font-medium">{displayName}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user?.email ?? 'Not signed in'}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  Settings
                </DropdownMenuItem>
                {!FREE_LAUNCH && (
                  <DropdownMenuItem onClick={() => router.push('/dashboard/upgrade')}>
                    Plans &amp; billing
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={signingOut}>
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/register">Sign up</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
