'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Printer,
  Settings2,
  Sunrise,
} from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LocationPicker, locateDevice } from '@/components/location/location-picker';
import { useSavedLocation } from '@/lib/geo/location';
import {
  CALCULATION_METHODS,
  PRAYER_ORDER,
  computeCurrentPrayer,
  fetchPrayerDay,
  fetchPrayerMonth,
  format12h,
  formatCountdown,
  parseGregorian,
  usePrayerSettings,
  type PrayerDay,
  type PrayerSettings,
} from '@/lib/prayer/prayer';
import { cn } from '@/lib/utils';
import { QiblaCompass } from '@/features/prayer-times/qibla-compass';

function SettingsPopover({
  settings,
  onChange,
}: {
  settings: PrayerSettings;
  onChange: (s: PrayerSettings) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Calculation
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="space-y-1.5">
          <Label>Calculation method</Label>
          <Select
            value={String(settings.method)}
            onValueChange={(v) => onChange({ ...settings, method: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALCULATION_METHODS.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name} <span className="text-muted-foreground">· {m.region}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the method your local mosque follows.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Asr time</Label>
          <Select
            value={String(settings.school)}
            onValueChange={(v) => onChange({ ...settings, school: v === '1' ? 1 : 0 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Standard (Shafi&apos;i, Maliki, Hanbali)</SelectItem>
              <SelectItem value="1">Hanafi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' })
);

function MonthlyTimetable({
  latitude,
  longitude,
  settings,
}: {
  latitude: number;
  longitude: number;
  settings: PrayerSettings;
}) {
  const today = new Date();
  const [period, setPeriod] = useState({ month: today.getMonth() + 1, year: today.getFullYear() });
  const [days, setDays] = useState<PrayerDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrayerMonth(latitude, longitude, settings, period)
      .then((d) => !cancelled && setDays(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, settings, period]);

  const shift = (delta: number) =>
    setPeriod((p) => {
      const d = new Date(p.year, p.month - 1 + delta, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    });

  const todayKey = today.toDateString();

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 print:hidden">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-[150px] text-center text-sm font-semibold text-foreground">
              {MONTH_NAMES[period.month - 1]} {period.year}
            </p>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print timetable
          </Button>
        </div>
        <h2 className="hidden p-4 text-lg font-semibold print:block">
          Prayer timetable — {MONTH_NAMES[period.month - 1]} {period.year}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading timetable…
          </div>
        ) : error ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Hijri</th>
                  <th className="px-3 py-2.5 font-medium">Fajr</th>
                  <th className="px-3 py-2.5 font-medium">Sunrise</th>
                  <th className="px-3 py-2.5 font-medium">Dhuhr</th>
                  <th className="px-3 py-2.5 font-medium">Asr</th>
                  <th className="px-3 py-2.5 font-medium">Maghrib</th>
                  <th className="px-3 py-2.5 font-medium">Isha</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const date = parseGregorian(d.gregorian.date);
                  const isToday = date.toDateString() === todayKey;
                  const isFriday = date.getDay() === 5;
                  return (
                    <tr
                      key={d.gregorian.date}
                      className={cn(
                        'border-b border-border/60 tabular-nums last:border-0',
                        isToday && 'bg-primary/10 font-semibold',
                        isFriday && !isToday && 'bg-muted/50'
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-foreground">
                        {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {d.hijri.day} {d.hijri.month.split(' ')[0]}
                      </td>
                      {(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map((k) => (
                        <td key={k} className="px-3 py-2 text-foreground/90">
                          {format12h(d.timings[k])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PrayerSchedule() {
  const { location, ready, save } = useSavedLocation();
  const { settings, ready: settingsReady, update } = usePrayerSettings();
  const [data, setData] = useState<PrayerDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [triedAutoLocate, setTriedAutoLocate] = useState(false);
  const [view, setView] = useState<'today' | 'month'>('today');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // First visit: try the device location once.
  useEffect(() => {
    if (!ready || location || triedAutoLocate) return;
    setTriedAutoLocate(true);
    locateDevice().then(save).catch(() => undefined);
  }, [ready, location, triedAutoLocate, save]);

  const dayKey = now.toDateString();
  useEffect(() => {
    if (!location || !settingsReady) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrayerDay(location.latitude, location.longitude, settings)
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) =>
        !cancelled && setError(e instanceof Error ? e.message : 'Could not load prayer times.')
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // Refetch when the calendar day changes (e.g. the page stays open past midnight).
  }, [location, settings, settingsReady, dayKey]);

  const current = useMemo(() => (data ? computeCurrentPrayer(data.timings, now) : null), [data, now]);
  const remainingMs = current ? current.nextDate.getTime() - now.getTime() : 0;
  const isFriday = now.getDay() === 5;

  return (
    <AppShell>
      <PageHeader
        title="Prayer Times"
        description="Accurate daily prayer times, the Qibla direction and a monthly timetable."
      >
        <SettingsPopover settings={settings} onChange={update} />
      </PageHeader>

      <div className="mb-5 print:hidden">
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
              Use your location or search for your city above to see today&apos;s prayer times.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 print:hidden">
            {(
              [
                ['today', 'Today'],
                ['month', 'Monthly timetable'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                  view === value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {view === 'month' ? (
            <MonthlyTimetable
              latitude={location.latitude}
              longitude={location.longitude}
              settings={settings}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
              <div>
                {loading && !data && (
                  <Card>
                    <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading prayer times…
                    </CardContent>
                  </Card>
                )}

                {error && !data && (
                  <Card>
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                      {error}
                    </CardContent>
                  </Card>
                )}

                {data && current && (
                  <Card className="overflow-hidden">
                    <div className="bg-girih relative bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid px-6 py-6 text-brand-linen">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="flex items-center gap-2 text-sm text-brand-linen/80">
                            <CalendarDays className="h-4 w-4" />
                            {parseGregorian(data.gregorian.date).toLocaleDateString(undefined, {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="mt-1 font-display text-lg font-semibold">
                            {data.hijri.day} {data.hijri.month} {data.hijri.year} AH
                          </p>
                          {data.hijri.holidays && data.hijri.holidays.length > 0 && (
                            <p className="mt-1 text-xs font-medium text-brand-gold">
                              {data.hijri.holidays.join(' · ')}
                            </p>
                          )}
                        </div>
                        {data.hijri.monthAr && (
                          <p className="font-arabic text-2xl text-brand-gold" lang="ar" dir="rtl">
                            {data.hijri.monthAr}
                          </p>
                        )}
                      </div>

                      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-brand-linen/70">
                            Next prayer
                          </p>
                          <p className="mt-1 font-display text-3xl font-bold">
                            {current.nextKey === 'Dhuhr' && isFriday ? "Jumu'ah" : current.nextKey}
                            <span className="ml-3 text-lg font-medium text-brand-linen/80">
                              {format12h(data.timings[current.nextKey])}
                            </span>
                          </p>
                        </div>
                        <p className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 font-mono text-xl font-semibold tabular-nums backdrop-blur">
                          <Clock className="h-5 w-5 text-brand-gold" />
                          {formatCountdown(remainingMs)}
                        </p>
                      </div>
                    </div>

                    <CardContent className="p-3 sm:p-4">
                      <ul className="space-y-1">
                        {PRAYER_ORDER.map((p) => {
                          const isCurrent = current.currentKey === p.key;
                          const isNext = current.nextKey === p.key;
                          return (
                            <li
                              key={p.key}
                              className={cn(
                                'flex items-center justify-between rounded-xl px-4 py-3.5 transition-colors',
                                isCurrent && 'bg-primary/10',
                                isNext && !isCurrent && 'bg-muted/60'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    'inline-flex h-2.5 w-2.5 rounded-full',
                                    isCurrent
                                      ? 'bg-primary ring-4 ring-primary/20'
                                      : 'bg-muted-foreground/30'
                                  )}
                                />
                                <span
                                  className={cn(
                                    'text-sm font-semibold',
                                    isCurrent ? 'text-primary' : 'text-foreground'
                                  )}
                                >
                                  {p.key === 'Dhuhr' && isFriday ? "Dhuhr · Jumu'ah" : p.label}
                                </span>
                                <span className="font-arabic text-sm text-muted-foreground" lang="ar">
                                  {p.arabic}
                                </span>
                                {isCurrent && (
                                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                    Now
                                  </span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  'font-mono text-sm tabular-nums',
                                  isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground'
                                )}
                              >
                                {format12h(data.timings[p.key])}
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                      <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Sunrise className="h-3.5 w-3.5" />
                          Sunrise {format12h(data.timings.Sunrise)}
                        </span>
                        {data.timings.Imsak && <span>Imsak {format12h(data.timings.Imsak)}</span>}
                        {data.method && <span>{data.method}</span>}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <QiblaCompass latitude={location.latitude} longitude={location.longitude} />
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
