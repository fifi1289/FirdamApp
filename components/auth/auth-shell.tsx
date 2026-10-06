import Link from 'next/link';
import { Check } from 'lucide-react';

import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const highlights = [
  'Halal places near you, wherever you are',
  'Prayer times, Ramadan, Quran and duas',
  'Family calendar, meals, groceries and budget',
  'Private and secure — your data stays yours',
];

export function AuthAside() {
  return (
    <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid p-12 text-white lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0, transparent 40%)',
        }}
      />

      <div className="relative">
        <span className="inline-flex items-center rounded-lg bg-white/95 px-3 py-1.5 shadow-sm">
          <Logo href="/" noLink height={40} />
        </span>
      </div>

      <div className="relative max-w-md">
        <h2 className="font-display text-3xl font-bold leading-tight">
          One home for your Muslim life.
        </h2>
        <p className="mt-3 font-arabic text-xl text-brand-gold" lang="ar" dir="rtl">
          بِسْمِ ٱللَّٰهِ
        </p>
        <p className="mt-4 text-white/80">
          Firdam brings halal living, faith and family together in one calm,
          trusted app.
        </p>
        <ul className="mt-8 space-y-4">
          {highlights.map((h) => (
            <li key={h} className="flex items-center gap-3 text-white/90">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <Check className="h-3.5 w-3.5" />
              </span>
              {h}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative text-sm text-white/70">
        © {new Date().getFullYear()} Firdam. One home for your Muslim life.
      </div>
    </aside>
  );
}

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function AuthShell({ children, title, description }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      <AuthAside />

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-6">
          <Link
            href="/"
            className="lg:hidden"
            aria-label="Back to home"
          >
            <Logo noLink height={34} />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
