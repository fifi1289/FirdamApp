import Link from 'next/link';
import { ArrowRight, Check, Clock, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { lifeModules, moduleIconMap } from '@/features/modules/module-config';

const PREVIEW_PRAYERS = [
  { name: 'Fajr', time: '5:42' },
  { name: 'Dhuhr', time: '1:04' },
  { name: 'Asr', time: '4:21', next: true },
  { name: 'Maghrib', time: '6:49' },
  { name: 'Isha', time: '8:08' },
];

const PREVIEW_PLACES = [
  { name: 'Al-Noor Halal Meats', type: 'Butcher', distance: '0.8 km', tone: 'bg-destructive' },
  { name: 'Barakah Grocery', type: 'Grocery', distance: '1.2 km', tone: 'bg-brand-sage' },
  { name: 'Sahara Grill', type: 'Restaurant', distance: '1.9 km', tone: 'bg-primary' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="bg-girih pointer-events-none absolute inset-0 -z-10 mask-fade-b opacity-70" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--primary)), transparent)' }}
      />

      <div className="container relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-arabic text-xl text-primary" lang="ar" dir="rtl">
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>

          <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            One home for your{' '}
            <span className="bg-gradient-to-r from-brand-mid to-brand-gold bg-clip-text text-transparent">
              Muslim life.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
            Find halal food wherever you live or travel, plan halal meals for the family, never miss
            a prayer, and prepare for Ramadan — all in one calm, trusted app.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/register">
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="#modules">See what&apos;s inside</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['Free plan', 'Private by design', 'Made for Muslim families'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-brand-sage" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Product preview */}
        <div className="mx-auto mt-16 max-w-5xl animate-fade-up">
          <div className="rounded-3xl border border-border/70 bg-card/70 p-2 shadow-2xl backdrop-blur-sm">
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border/60 bg-background p-4 md:grid-cols-[1.1fr_1fr] md:p-6">
              <div className="bg-girih rounded-2xl bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid p-5 text-brand-linen">
                <p className="text-xs uppercase tracking-wider text-brand-linen/70">Next prayer</p>
                <p className="mt-1 font-display text-3xl font-bold">Asr</p>
                <p className="flex items-center gap-1.5 text-sm text-brand-linen/80">
                  <Clock className="h-4 w-4 text-brand-gold" /> in 1h 12m · 14 Rabi&apos; al-Thani 1448
                </p>
                <div className="mt-5 grid grid-cols-5 gap-1.5 text-center">
                  {PREVIEW_PRAYERS.map((p) => (
                    <div
                      key={p.name}
                      className={`rounded-lg px-1 py-2 ${p.next ? 'bg-brand-gold text-brand-espresso' : 'bg-white/10'}`}
                    >
                      <p className="text-[10px] font-medium opacity-80">{p.name}</p>
                      <p className="text-xs font-semibold tabular-nums">{p.time}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> Halal near you
                </p>
                <ul className="mt-3 space-y-2">
                  {PREVIEW_PLACES.map((p) => (
                    <li key={p.name} className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${p.tone}`} />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-foreground">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.type} · Halal certified</span>
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{p.distance}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                {lifeModules.map((m) => {
                  const Icon = moduleIconMap[m.icon];
                  return (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {m.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
