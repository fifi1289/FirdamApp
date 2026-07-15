import Link from 'next/link';
import { ArrowRight, Sparkles, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-b opacity-50" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, hsl(var(--primary)), transparent)',
        }}
      />

      <div className="container relative py-20 md:py-28 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Introducing Firdam — your life, modular
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            One calm place for{' '}
            <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              every part of life
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
            Firdam brings your prayer times, family, finance, travel, shopping,
            health, and community together — modular by design, so you only turn
            on what you need.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/register">
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard">View dashboard</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['No credit card required', 'Free forever plan', 'Works offline'].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </span>
              )
            )}
          </div>
        </div>

        {/* Preview card */}
        <div className="mx-auto mt-16 max-w-5xl animate-fade-up">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-2 shadow-2xl backdrop-blur-sm">
            <div className="rounded-xl border border-border/60 bg-background p-6 md:p-10">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Prayer Times', tone: 'from-teal-500 to-emerald-500' },
                  { label: 'Finance', tone: 'from-emerald-500 to-green-600' },
                  { label: 'Family', tone: 'from-rose-400 to-orange-400' },
                  { label: 'Travel', tone: 'from-sky-500 to-cyan-500' },
                  { label: 'Shopping', tone: 'from-amber-400 to-yellow-500' },
                  { label: 'Health', tone: 'from-red-400 to-rose-500' },
                  { label: 'Community', tone: 'from-violet-400 to-fuchsia-400' },
                  { label: 'Learning', tone: 'from-indigo-400 to-blue-500' },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="group relative overflow-hidden rounded-lg border border-border/60 bg-card p-4 text-left transition-transform duration-300 ease-out-expo hover:-translate-y-1"
                  >
                    <div
                      className={`mb-3 h-10 w-10 rounded-lg bg-gradient-to-br ${m.tone} opacity-90`}
                    />
                    <p className="text-sm font-medium text-foreground">
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
