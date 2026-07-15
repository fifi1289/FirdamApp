import Link from 'next/link';
import { Check } from 'lucide-react';

import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const highlights = [
  'Organize every part of life in modules',
  'Private, secure, and synced across devices',
  'Calm, distraction-free interface',
];

export function AuthAside() {
  return (
    <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-dark via-brand-mid to-brand-light p-12 text-white lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0, transparent 40%)',
        }}
      />

      <div className="relative">
        <Logo href="/" variant="light" />
      </div>

      <div className="relative max-w-md">
        <h2 className="font-display text-3xl font-bold leading-tight">
          Everything that matters. One place.
        </h2>
        <p className="mt-4 text-white/80">
          Firdam is a modern life management platform — bring every part of
          your life into one calm, modular workspace.
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
        © {new Date().getFullYear()} Firdam. Everything that matters. One place.
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
            <Logo showWordmark={false} />
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
