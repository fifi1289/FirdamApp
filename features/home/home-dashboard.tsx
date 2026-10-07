'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarHeart,
  CheckCircle2,
  ChefHat,
  ListChecks,
  MapPin,
  Moon,
  ShoppingCart,
  Sparkles,
  Utensils,
  Wallet,
} from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { firstNameFor } from '@/lib/auth/display-name';
import { useSavedLocation } from '@/lib/geo/location';
import {
  computeCurrentPrayer,
  fetchPrayerDay,
  format12h,
  formatRelative,
  usePrayerSettings,
  type PrayerDay,
} from '@/lib/prayer/prayer';
import { cn } from '@/lib/utils';
import { usePlan } from '@/lib/plan/plan';
import { MODULE_GROUPS, lifeModules } from '@/features/modules/module-config';
import { ModuleCard } from '@/features/modules/module-card';
import { DuaCard } from '@/features/quran/duas-view';
import { duaOfTheDay } from '@/features/quran/duas';
import { normalizePlan, type MockMeal } from '@/features/meals/meal-plan-generator';
import { formatMoney, monthBounds, useCurrency } from '@/features/budget/budget-config';
import { isoDate } from '@/features/quran/quran-reading';
import { useCalendarData } from '@/features/calendar/use-calendar';
import { EVENT_KINDS, parseISODate } from '@/features/calendar/calendar-config';

interface Snapshot {
  tasksOpen: number;
  tasksDone: number;
  meals: MockMeal[];
  groceriesLeft: number;
  budgetLeft: number | null;
  spent: number;
  quranToday: number;
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Tile({
  href,
  icon: Icon,
  label,
  value,
  sub,
  children,
}: {
  href: string;
  icon: typeof Moon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
          {children}
        </CardContent>
      </Card>
    </Link>
  );
}

export function HomeDashboard() {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const { location } = useSavedLocation();
  const { settings, ready: settingsReady } = usePrayerSettings();
  const { isPaid } = usePlan();
  const { currency } = useCurrency();
  const [now, setNow] = useState(() => new Date());
  const [prayer, setPrayer] = useState<PrayerDay | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!location || !settingsReady) return;
    fetchPrayerDay(location.latitude, location.longitude, settings)
      .then(setPrayer)
      .catch(() => setPrayer(null));
  }, [location, settings, settingsReady]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = isoDate();
      const d = new Date();
      const { start, end } = monthBounds(d.getFullYear(), d.getMonth() + 1);
      const [tasks, plans, groceries, cats, tx, quran] = await Promise.all([
        supabase.from('planner_tasks').select('completed').eq('scheduled_date', today),
        supabase.from('meal_plans').select('plan_data').order('created_at', { ascending: false }).limit(1),
        supabase.from('grocery_items').select('id').eq('checked', false),
        supabase.from('budget_categories').select('monthly_limit'),
        supabase
          .from('budget_transactions')
          .select('amount,type')
          .eq('type', 'expense')
          .gte('occurred_on', start)
          .lte('occurred_on', end),
        supabase.from('quran_reading_sessions').select('pages').eq('read_on', today),
      ]);
      if (cancelled) return;

      let meals: MockMeal[] = [];
      const record = plans.data?.[0];
      if (record) {
        const plan = normalizePlan(record.plan_data as Record<string, unknown>);
        meals = plan.days.find((day) => day.date === today)?.meals ?? [];
      }
      const limit = (cats.data ?? []).reduce((s, c) => s + (c.monthly_limit ? Number(c.monthly_limit) : 0), 0);
      const spent = (tx.data ?? []).reduce((s, t) => s + Number(t.amount), 0);

      setSnap({
        tasksOpen: (tasks.data ?? []).filter((t) => !t.completed).length,
        tasksDone: (tasks.data ?? []).filter((t) => t.completed).length,
        meals,
        groceriesLeft: groceries.data?.length ?? 0,
        budgetLeft: limit > 0 ? limit - spent : null,
        spent,
        quranToday: (quran.data ?? []).reduce((s, q) => s + q.pages, 0),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const rangeEnd = useMemo(() => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + 14);
    return d;
  }, [rangeStart]);
  const { items: upcoming } = useCalendarData(rangeStart, rangeEnd);

  const current = prayer ? computeCurrentPrayer(prayer.timings, now) : null;
  const dua = useMemo(() => duaOfTheDay(), []);
  const name = user ? firstNameFor(user) : '';
  const isFriday = now.getDay() === 5;

  return (
    <AppShell>
      {/* Greeting + prayer */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <div className="bg-girih relative h-full bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid p-6 text-brand-linen md:p-8">
            <p className="font-arabic text-lg text-brand-gold" lang="ar" dir="rtl">
              السَّلَامُ عَلَيْكُمْ
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">
              {greeting(now)}{name ? `, ${name}` : ''}
            </h1>
            <p className="mt-1 text-sm text-brand-linen/80">
              {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              {prayer && (
                <>
                  {' · '}
                  {prayer.hijri.day} {prayer.hijri.month} {prayer.hijri.year} AH
                </>
              )}
            </p>
            {prayer?.hijri.holidays && prayer.hijri.holidays.length > 0 && (
              <p className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-gold">
                {prayer.hijri.holidays.join(' · ')}
              </p>
            )}
            {isFriday && (
              <p className="mt-3 text-sm text-brand-linen/90">
                Jumu&apos;ah Mubarak — remember Surah Al-Kahf and extra salawat today.
              </p>
            )}
          </div>
        </Card>

        <Link href="/dashboard/prayer-times" className="group">
          <Card className="h-full transition-all group-hover:border-primary/30 group-hover:shadow-md">
            <CardContent className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Next prayer</p>
                <Moon className="h-5 w-5 text-primary" />
              </div>
              {current && prayer ? (
                <>
                  <p className="mt-3 font-display text-3xl font-bold text-foreground">
                    {current.nextKey === 'Dhuhr' && isFriday ? "Jumu'ah" : current.nextKey}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format12h(prayer.timings[current.nextKey])} ·{' '}
                    {formatRelative(current.nextDate.getTime() - now.getTime())}
                  </p>
                  <div className="mt-auto grid grid-cols-5 gap-1 pt-5 text-center">
                    {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map((k) => (
                      <div
                        key={k}
                        className={cn(
                          'rounded-lg px-1 py-1.5',
                          current.nextKey === k ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}
                      >
                        <p className="text-[10px] font-medium opacity-80">{k}</p>
                        <p className="text-[11px] font-semibold tabular-nums">
                          {format12h(prayer.timings[k]).replace(/ (AM|PM)$/, '')}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    {location ? 'Loading today’s prayer times…' : 'Set your location to see prayer times.'}
                  </p>
                  {!location && (
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Set location <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today at a glance */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-foreground">Today at a glance</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          href="/dashboard/planner"
          icon={ListChecks}
          label="Tasks today"
          value={snap ? snap.tasksOpen : '—'}
          sub={
            snap
              ? snap.tasksOpen === 0 && snap.tasksDone > 0
                ? 'All done — alhamdulillah'
                : `${snap.tasksDone} completed`
              : undefined
          }
        />
        <Tile
          href="/dashboard/meals"
          icon={Utensils}
          label="Today's meals"
          value={snap ? (snap.meals.length ? `${snap.meals.length} planned` : 'Not planned') : '—'}
          sub={
            snap?.meals.length ? (
              <span className="line-clamp-1">{snap.meals.map((m) => m.name).join(' · ')}</span>
            ) : (
              'Plan halal meals for the week'
            )
          }
        />
        <Tile
          href="/dashboard/finance"
          icon={Wallet}
          label={snap && snap.budgetLeft !== null ? 'Budget left' : 'Spent this month'}
          value={
            snap
              ? snap.budgetLeft !== null
                ? formatMoney(snap.budgetLeft, currency)
                : formatMoney(snap.spent, currency)
              : '—'
          }
          sub={
            !snap
              ? undefined
              : snap.budgetLeft !== null
                ? `${formatMoney(snap.spent, currency)} spent so far`
                : 'Set category limits to plan your month'
          }
        />
        <Tile
          href="/dashboard/shopping"
          icon={ShoppingCart}
          label="Groceries to buy"
          value={snap ? snap.groceriesLeft : '—'}
          sub={snap?.groceriesLeft ? 'items on your lists' : 'Your lists are clear'}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarHeart className="h-4 w-4 text-primary" />
                Coming up in the next two weeks
              </h3>
              <Link href="/dashboard/calendar" className="text-xs font-medium text-primary hover:underline">
                Calendar
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Nothing on the calendar. Add Eid plans, birthdays or school events.
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {upcoming.slice(0, 6).map((it) => {
                  const meta = EVENT_KINDS[it.kind];
                  const Icon = meta.icon;
                  return (
                    <li key={it.id} className="flex items-center gap-3 rounded-xl p-2">
                      <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.pill)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{it.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {parseISODate(it.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <DuaCard dua={dua} showTransliteration />
          <Link href="/dashboard/quran?tab=reading" className="block">
            <Card className="transition-colors hover:border-primary/30">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Quran today</p>
                  <Progress value={Math.min(100, ((snap?.quranToday ?? 0) / 4) * 100)} className="mt-2 h-1.5" />
                </div>
                <span className="flex items-center gap-1 text-sm font-medium tabular-nums text-foreground">
                  {(snap?.quranToday ?? 0) >= 4 && <CheckCircle2 className="h-4 w-4 text-brand-sage" />}
                  {snap?.quranToday ?? 0} pages
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {isPaid ? (
        <Link
          href="/dashboard/companion"
          className="bg-girih mt-5 flex items-center gap-4 rounded-2xl border border-brand-gold/40 bg-gradient-to-r from-brand-gold/15 to-transparent p-5 transition-colors hover:border-brand-gold"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand-gold text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Ask your Family Companion</p>
            <p className="text-sm text-muted-foreground">
              “What’s on this week?” · “Add dates and milk to my list” · “Plan a quick halal dinner”
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
        </Link>
      ) : (
        <Link
          href="/dashboard/recipes?tab=cook"
          className="bg-girih mt-5 flex items-center gap-4 rounded-2xl border border-brand-gold/40 bg-gradient-to-r from-brand-gold/15 to-transparent p-5 transition-colors hover:border-brand-gold"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand-gold text-white">
            <ChefHat className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-foreground">What can I cook tonight?</p>
            <p className="text-sm text-muted-foreground">
              Type what’s in your fridge — chicken, tomato, eggs — and get halal recipes you can make now.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
        </Link>
      )}

      <Link
        href="/dashboard/halal-places"
        className="mt-5 flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-colors hover:border-primary/40"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Find halal food near you</p>
          <p className="text-sm text-muted-foreground">
            Halal grocers, butchers, restaurants and mosques — at home or while travelling.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-primary" />
      </Link>

      {/* Modules */}
      <div className="mt-10 space-y-8">
        {MODULE_GROUPS.map((group) => (
          <section key={group}>
            <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">{group}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lifeModules
                .filter((m) => m.group === group)
                .map((m) => (
                  <ModuleCard key={m.id} module={m} />
                ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/support">Need help? Visit support</Link>
        </Button>
      </div>
    </AppShell>
  );
}
