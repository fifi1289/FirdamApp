'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  HandHeart,
  Loader2,
  MapPin,
  Moon,
  MoonStar,
  Sparkles,
  Star,
  Sunrise,
  Sunset,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/location/location-picker';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSavedLocation } from '@/lib/geo/location';
import {
  fetchPrayerDay,
  fetchPrayerMonth,
  format12h,
  formatCountdown,
  parseGregorian,
  timeOnDate,
  usePrayerSettings,
  type PrayerDay,
} from '@/lib/prayer/prayer';
import { cn } from '@/lib/utils';
import type { FastStatus, RamadanDay } from '@/types/database';
import { DuaCard } from '@/features/quran/duas-view';
import { DUAS } from '@/features/quran/duas';

const PREP_KEY = 'firdam.ramadan.prep';

const PREP_ITEMS: { id: string; label: string; href?: string }[] = [
  { id: 'qada', label: 'Make up any missed fasts from last year' },
  { id: 'quran', label: 'Set a Quran goal for the month', href: '/dashboard/quran?tab=reading' },
  { id: 'meals', label: 'Plan suhoor and iftar meals', href: '/dashboard/meals' },
  { id: 'groceries', label: 'Stock up on dates, water and staples', href: '/dashboard/shopping' },
  { id: 'zakat', label: 'Calculate zakat and plan your sadaqah', href: '/dashboard/finance' },
  { id: 'masjid', label: 'Find your local masjid for taraweeh', href: '/dashboard/halal-places?category=mosque' },
  { id: 'eid', label: 'Prepare Eid gifts and clothes for the family' },
];

type DayRecord = Pick<RamadanDay, 'day' | 'fast_status' | 'taraweeh' | 'quran_pages' | 'charity' | 'note'>;

function emptyRecord(day: number): DayRecord {
  return { day, fast_status: null, taraweeh: false, quran_pages: 0, charity: false, note: null };
}

function DayEditor({
  record,
  onChange,
}: {
  record: DayRecord;
  onChange: (patch: Partial<DayRecord>) => void;
}) {
  const [pages, setPages] = useState(String(record.quran_pages || ''));
  useEffect(() => setPages(String(record.quran_pages || '')), [record.quran_pages]);

  const statuses: { value: FastStatus; label: string }[] = [
    { value: 'fasted', label: 'Fasted' },
    { value: 'missed', label: 'Missed' },
    { value: 'excused', label: 'Excused' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Fast</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ fast_status: record.fast_status === s.value ? null : s.value })}
              className={cn(
                'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                record.fast_status === s.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {record.fast_status === 'excused' && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Travel, illness or another valid reason — it will count towards fasts to make up.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor={`tar-${record.day}`} className="text-sm">
          Prayed taraweeh
        </Label>
        <Switch
          id={`tar-${record.day}`}
          checked={record.taraweeh}
          onCheckedChange={(v) => onChange({ taraweeh: v })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor={`char-${record.day}`} className="text-sm">
          Gave charity
        </Label>
        <Switch
          id={`char-${record.day}`}
          checked={record.charity}
          onCheckedChange={(v) => onChange({ charity: v })}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`pages-${record.day}`} className="text-sm">
          Quran pages
        </Label>
        <Input
          id={`pages-${record.day}`}
          inputMode="numeric"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          onBlur={() => {
            const n = Math.max(0, Math.min(604, Math.round(Number(pages) || 0)));
            if (n !== record.quran_pages) onChange({ quran_pages: n });
          }}
          className="h-8 w-20 text-right"
        />
      </div>
    </div>
  );
}

export function RamadanDashboard() {
  const supabase = createSupabaseBrowserClient();
  const { location, ready, save } = useSavedLocation();
  const { settings, ready: settingsReady } = usePrayerSettings();
  const [today, setToday] = useState<PrayerDay | null>(null);
  const [days, setDays] = useState<PrayerDay[]>([]);
  const [hijriYear, setHijriYear] = useState<number | null>(null);
  const [records, setRecords] = useState<Map<number, DayRecord>>(new Map());
  const [lastYearQada, setLastYearQada] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [prep, setPrep] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREP_KEY);
      if (raw) setPrep(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore
    }
  }, []);

  const togglePrep = (id: string) =>
    setPrep((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(PREP_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });

  // Load today's Hijri date, then the Ramadan timetable for the right year.
  const dayKey = now.toDateString();
  useEffect(() => {
    if (!location || !settingsReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await fetchPrayerDay(location.latitude, location.longitude, settings);
        if (cancelled) return;
        setToday(t);
        const hMonth = t.hijri.monthNumber ?? 0;
        const hYear = Number(t.hijri.year);
        const target = hMonth > 9 ? hYear + 1 : hYear;
        setHijriYear(target);
        const month = await fetchPrayerMonth(location.latitude, location.longitude, settings, {
          hijriMonth: 9,
          hijriYear: target,
        });
        if (cancelled) return;
        setDays(month);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load Ramadan times.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location, settings, settingsReady, dayKey]);

  const loadRecords = useCallback(
    async (year: number) => {
      const { data, error: err } = await supabase
        .from('ramadan_days')
        .select('*')
        .in('hijri_year', [year, year - 1]);
      if (err) {
        console.error('Failed to load Ramadan tracker:', err.message);
        return;
      }
      const map = new Map<number, DayRecord>();
      let qada = 0;
      for (const r of data ?? []) {
        if (r.hijri_year === year) map.set(r.day, r);
        else if (r.fast_status === 'missed' || r.fast_status === 'excused') qada++;
      }
      setRecords(map);
      setLastYearQada(qada);
    },
    [supabase]
  );

  useEffect(() => {
    if (hijriYear) loadRecords(hijriYear);
  }, [hijriYear, loadRecords]);

  const updateDay = async (day: number, patch: Partial<DayRecord>) => {
    if (!hijriYear) return;
    const current = records.get(day) ?? emptyRecord(day);
    const next = { ...current, ...patch };
    setRecords((prev) => new Map(prev).set(day, next));
    const { error: err } = await supabase.from('ramadan_days').upsert(
      {
        hijri_year: hijriYear,
        day,
        fast_status: next.fast_status,
        taraweeh: next.taraweeh,
        quran_pages: next.quran_pages,
        charity: next.charity,
        note: next.note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,hijri_year,day' }
    );
    if (err) {
      toast.error('Could not save', { description: err.message });
      loadRecords(hijriYear);
    }
  };

  const isRamadan = today?.hijri.monthNumber === 9;
  const todayIndex = isRamadan ? Number(today!.hijri.day) : null;
  const start = days[0] ? parseGregorian(days[0].gregorian.date) : null;
  const daysUntil = start
    ? Math.ceil((start.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
    : null;

  // Suhoor / iftar countdown for today.
  const fastInfo = useMemo(() => {
    if (!today) return null;
    const suhoorEnd = timeOnDate(today.timings.Imsak || today.timings.Fajr, now);
    const iftar = timeOnDate(today.timings.Maghrib, now);
    if (now < suhoorEnd) return { label: 'Suhoor ends in', target: suhoorEnd };
    if (now < iftar) return { label: 'Iftar in', target: iftar };
    return null;
  }, [today, now]);

  const stats = useMemo(() => {
    let fasted = 0;
    let toMakeUp = 0;
    let pages = 0;
    let taraweeh = 0;
    let charity = 0;
    records.forEach((r) => {
      if (r.fast_status === 'fasted') fasted++;
      if (r.fast_status === 'missed' || r.fast_status === 'excused') toMakeUp++;
      pages += r.quran_pages;
      if (r.taraweeh) taraweeh++;
      if (r.charity) charity++;
    });
    return { fasted, toMakeUp, pages, taraweeh, charity };
  }, [records]);

  const iftarDua = DUAS.find((d) => d.id === 'iftar')!;
  const qadrDua = DUAS.find((d) => d.id === 'laylatul-qadr')!;
  const inLastTen = todayIndex !== null && todayIndex >= 21;

  return (
    <AppShell>
      <PageHeader
        title="Ramadan"
        description="Suhoor and iftar times, a daily fasting tracker, and your Quran goal for the blessed month."
      />

      <div className="mb-5">
        <LocationPicker value={location} onChange={save} />
      </div>

      {!ready ? null : !location ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-foreground">Set your location</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Suhoor and iftar times depend on where you are.
            </p>
          </CardContent>
        </Card>
      ) : loading && days.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing your Ramadan planner…
          </CardContent>
        </Card>
      ) : error && days.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Hero */}
          <Card className="overflow-hidden">
            <div className="bg-girih relative bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid p-6 text-brand-linen md:p-8">
              <MoonStar className="absolute right-6 top-6 h-16 w-16 text-brand-gold/30 md:h-24 md:w-24" />
              {isRamadan ? (
                <>
                  <p className="text-sm font-medium text-brand-gold">Ramadan Mubarak</p>
                  <h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">
                    Day {todayIndex} of Ramadan {hijriYear}
                  </h2>
                  {fastInfo ? (
                    <div className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                      <span className="text-sm text-brand-linen/80">{fastInfo.label}</span>
                      <span className="font-mono text-2xl font-semibold tabular-nums">
                        {formatCountdown(fastInfo.target.getTime() - now.getTime())}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-brand-linen/85">
                      May Allah accept your fast today. Taraweeh tonight — and suhoor before{' '}
                      {format12h(days[todayIndex ?? 0]?.timings.Imsak ?? today?.timings.Imsak ?? '')}.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-brand-gold">Ramadan {hijriYear}</p>
                  <h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">
                    {daysUntil !== null && daysUntil > 0
                      ? `${daysUntil} day${daysUntil === 1 ? '' : 's'} to go`
                      : 'Coming soon'}
                  </h2>
                  {start && (
                    <p className="mt-2 text-sm text-brand-linen/85">
                      Expected to begin around{' '}
                      {start.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      , in sha Allah.
                    </p>
                  )}
                </>
              )}
              {today && (
                <div className="mt-6 flex flex-wrap gap-6 text-sm">
                  <span className="flex items-center gap-2">
                    <Sunrise className="h-4 w-4 text-brand-gold" />
                    Suhoor ends {format12h(today.timings.Imsak || today.timings.Fajr)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Sunset className="h-4 w-4 text-brand-gold" />
                    Iftar {format12h(today.timings.Maghrib)}
                  </span>
                  <span className="flex items-center gap-2 text-brand-linen/70">Today · {location.name}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Fasts completed</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.fasted}
                  <span className="text-base font-medium text-muted-foreground">/{days.length || 30}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">To make up</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.toMakeUp}
                </p>
                {lastYearQada > 0 && (
                  <p className="text-[11px] text-muted-foreground">+{lastYearQada} from last Ramadan</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Quran pages</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.pages}
                  <span className="text-base font-medium text-muted-foreground">/604</span>
                </p>
                <Progress value={Math.min(100, (stats.pages / 604) * 100)} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Taraweeh nights</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                  {stats.taraweeh}
                </p>
                <p className="text-[11px] text-muted-foreground">Charity on {stats.charity} days</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
            {/* 30-day tracker */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Your 30 days</h3>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand-sage" /> Fasted
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Missed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Excused
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-brand-gold text-brand-gold" /> Odd nights
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10">
                  {(days.length ? days : Array.from({ length: 30 }, () => null)).map((d, i) => {
                    const dayNum = i + 1;
                    const rec = records.get(dayNum) ?? emptyRecord(dayNum);
                    const isToday = todayIndex === dayNum;
                    const isFuture = isRamadan ? dayNum > (todayIndex ?? 0) : true;
                    const lastTen = dayNum >= 21;
                    const oddNight = lastTen && dayNum % 2 === 1;
                    const date = d ? parseGregorian(d.gregorian.date) : null;
                    return (
                      <Popover key={dayNum}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'relative flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition-all hover:border-primary/50',
                              isToday ? 'border-primary ring-2 ring-primary/25' : 'border-border',
                              lastTen && !rec.fast_status && 'bg-brand-gold/10',
                              rec.fast_status === 'fasted' && 'border-brand-sage/40 bg-brand-sage/15',
                              rec.fast_status === 'missed' && 'border-destructive/40 bg-destructive/10',
                              rec.fast_status === 'excused' && 'border-warning/50 bg-warning/15',
                              isFuture && !rec.fast_status && 'opacity-70'
                            )}
                            aria-label={`Ramadan day ${dayNum}`}
                          >
                            {oddNight && (
                              <Star className="absolute right-1 top-1 h-2.5 w-2.5 fill-brand-gold text-brand-gold" />
                            )}
                            <span className="text-sm font-semibold tabular-nums text-foreground">{dayNum}</span>
                            {date && (
                              <span className="text-[9px] leading-tight text-muted-foreground">
                                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            <span className="mt-0.5 flex gap-0.5">
                              {rec.taraweeh && <Moon className="h-2.5 w-2.5 text-primary" />}
                              {rec.quran_pages > 0 && <BookOpen className="h-2.5 w-2.5 text-primary" />}
                              {rec.charity && <HandHeart className="h-2.5 w-2.5 text-primary" />}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72">
                          <div className="mb-3">
                            <p className="font-semibold text-foreground">
                              Day {dayNum}
                              {oddNight && (
                                <span className="ml-2 text-xs font-normal text-brand-gold">
                                  Seek Laylat al-Qadr tonight
                                </span>
                              )}
                            </p>
                            {d && (
                              <p className="text-xs text-muted-foreground">
                                {date?.toLocaleDateString(undefined, {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                })}{' '}
                                · Suhoor {format12h(d.timings.Imsak || d.timings.Fajr)} · Iftar{' '}
                                {format12h(d.timings.Maghrib)}
                              </p>
                            )}
                          </div>
                          <DayEditor record={rec} onChange={(patch) => updateDay(dayNum, patch)} />
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Tap a day to record your fast, taraweeh, Quran and charity. Dates follow the
                  calculated calendar and may differ by a day from your local moon sighting.
                </p>
              </CardContent>
            </Card>

            {/* Side column */}
            <div className="space-y-5">
              {!isRamadan && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Get ready for Ramadan
                    </h3>
                    <ul className="mt-3 space-y-1">
                      {PREP_ITEMS.map((item) => {
                        const done = prep.has(item.id);
                        return (
                          <li key={item.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => togglePrep(item.id)}
                              aria-label={done ? `Mark "${item.label}" not done` : `Mark "${item.label}" done`}
                              className="shrink-0"
                            >
                              {done ? (
                                <CheckCircle2 className="h-5 w-5 text-brand-sage" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            {item.href ? (
                              <Link
                                href={item.href}
                                className={cn(
                                  'flex-1 rounded-lg py-1.5 text-sm hover:text-primary',
                                  done ? 'text-muted-foreground line-through' : 'text-foreground'
                                )}
                              >
                                {item.label}
                              </Link>
                            ) : (
                              <span
                                className={cn(
                                  'flex-1 py-1.5 text-sm',
                                  done ? 'text-muted-foreground line-through' : 'text-foreground'
                                )}
                              >
                                {item.label}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {inLastTen && (
                <Card className="border-brand-gold/40 bg-brand-gold/10">
                  <CardContent className="p-5 text-sm">
                    <p className="font-semibold text-foreground">The last ten nights</p>
                    <p className="mt-1 text-muted-foreground">
                      Seek Laylat al-Qadr in the odd nights, and remember to give Zakat al-Fitr
                      before the Eid prayer.
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href="/dashboard/finance">
                        <HandHeart className="mr-2 h-4 w-4" />
                        Record Zakat al-Fitr
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              <DuaCard dua={inLastTen ? qadrDua : iftarDua} showTransliteration />

              <Card>
                <CardContent className="flex items-center gap-3 p-5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Utensils className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Suhoor & iftar meals</p>
                    <p className="text-xs text-muted-foreground">Plan a week of halal meals in one go.</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/meals">Plan</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Timetable */}
          {days.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground">Ramadan timetable · {location.name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => window.print()}>
                    Print
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5 font-medium">Day</th>
                        <th className="px-3 py-2.5 font-medium">Date</th>
                        <th className="px-3 py-2.5 font-medium">Suhoor ends</th>
                        <th className="px-3 py-2.5 font-medium">Fajr</th>
                        <th className="px-3 py-2.5 font-medium">Iftar (Maghrib)</th>
                        <th className="px-3 py-2.5 font-medium">Isha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d, i) => {
                        const isToday = todayIndex === i + 1;
                        return (
                          <tr
                            key={d.gregorian.date}
                            className={cn(
                              'border-b border-border/60 tabular-nums last:border-0',
                              isToday && 'bg-primary/10 font-semibold',
                              i >= 20 && !isToday && 'bg-brand-gold/5'
                            )}
                          >
                            <td className="px-4 py-2 text-foreground">
                              {i + 1}
                              {isToday && <Check className="ml-1 inline h-3.5 w-3.5 text-primary" />}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {parseGregorian(d.gregorian.date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-3 py-2 text-foreground">{format12h(d.timings.Imsak)}</td>
                            <td className="px-3 py-2 text-foreground/80">{format12h(d.timings.Fajr)}</td>
                            <td className="px-3 py-2 font-medium text-primary">{format12h(d.timings.Maghrib)}</td>
                            <td className="px-3 py-2 text-foreground/80">{format12h(d.timings.Isha)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
