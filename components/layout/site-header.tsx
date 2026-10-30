'use client';

import * as React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useAuth } from '@/components/auth/auth-provider';
import { tr } from '@/lib/i18n';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'For shops', href: '/partners' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { loading, authenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between">
        <Logo height={64} />

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {tr(link.label)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {loading ? null : authenticated ? (
            <Button asChild size="sm">
              <Link href="/dashboard">{tr('Go to dashboard')}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild size="sm">
                <Link href="/auth/login">{tr('Sign in')}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/register">{tr('Get started')}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((o) => !o)}
            aria-label={tr('Toggle menu')}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
        className={cn(
          'overflow-hidden border-t border-border/60 transition-all duration-300 ease-out-expo md:hidden',
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="container flex flex-col gap-1 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {tr(link.label)}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            {loading ? null : authenticated ? (
              <Button asChild>
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  {tr('Go to dashboard')}
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/auth/login" onClick={() => setOpen(false)}>
                    {tr('Sign in')}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/register" onClick={() => setOpen(false)}>
                    {tr('Get started')}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
