'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Loader2 } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { readSavedLocation } from '@/lib/geo/location';
import { DEFAULT_PRAYER_SETTINGS, fetchPrayerMonth, parseGregorian } from '@/lib/prayer/prayer';
import { useReminderSettings } from '@/lib/reminders/reminders';
import { MakeupCard } from '@/features/fasting/makeup-card';
import { insideRamadan, isoDate, nextRamadan } from '@/features/fasting/makeup-core';
import { cn } from '@/lib/utils';
import { iso, parseISODate, sunnahFastingDays, type FastingDay, type HijriLabel } from '@/features/calendar/calendar-core';
import { locale, tr, trn } from '@/lib/i18n';
import { hijriMonthLabel } from '@/lib/prayer/prayer';

export const FASTING_PREFS_KEY = 'firdam.fasting';

/** Hijri labels for the next `days` days, from the same source as the calendar. */
async function loadHijri(days: number): Promise<{ map: Map<string, HijriLabel>; start: Date; end: Date }> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const loc = readSavedLocation();
  const lat = loc?.latitude ?? 21.4225;
  const lng = loc?.longitude ?? 39.8262;
  const months: { month: number; year: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    months.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const results = await Promise.all(months.map((m) => fetchPrayerMonth(lat, lng, DEFAULT_PRAYER_SETTINGS, m)));
  const map = new Map<string, HijriLabel>();
  for (const month of results) {
    for (const d of month) {
      map.set(iso(parseGregorian(d.gregorian.date)), {
        day: Number(d.hijri.day),
        month: hijriMonthLabel(d.hijri),
        monthNumber: d.hijri.monthNumber ?? 0,
        year: Number(d.hijri.year),
      });
    }
  }
  return { map, start, end };
}

/** Sunnah fasts coming up, the same list as the phone app's Fasting. */
export function FastingDashboard() {
  const [monThu, setMonThu] = useState(false);
  const [days, setDays] = useState<FastingDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { settings: reminders, permission, update } = useReminderSettings();
  // Two tabs keep the page short: Sunnah fasts, and Ramadan (with days to make up).
  const [tab, setTab] = useState<'sunnah' | 'ramadan'>(() => (insideRamadan(isoDate(new Date())) ? 'ramadan' : 'sunnah'));
  const next = nextRamadan();

  useEffect(() => {
    try {
      setMonThu(Boolean((JSON.parse(window.localStorage.getItem(FASTING_PREFS_KEY) ?? '{}') as { mondaysThursdays?: boolean }).mondaysThursdays));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    loadHijri(60)
      .then(({ map, start, end }) => {
        if (!cancelled) setDays(sunnahFastingDays(map, start, end, { sunnahFasts: true, mondaysThursdays: monThu }));
      })
      .catch(() => {
        if (!cancelled) {
          setDays([]);
          setError(tr('Could not load the Hijri dates. Check your connection and refresh the page.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [monThu]);

  const changeMonThu = (v: boolean) => {
    setMonThu(v);
    try {
      const prev = JSON.parse(window.localStorage.getItem(FASTING_PREFS_KEY) ?? '{}') as object;
      window.localStorage.setItem(FASTING_PREFS_KEY, JSON.stringify({ ...prev, mondaysThursdays: v }));
    } catch {
      // ignore
    }
  };

  const today = iso(new Date());

  return (
    <AppShell>
      <PageHeader
        title={tr('Fasting')}
        description={tr('Sunnah fasts and Ramadan.')}
      />

      <nav aria-label={tr('Fasting')} className="mb-5 flex gap-2">
        {(
          [
            ['sunnah', 'Sunnah fasts'],
            ['ramadan', 'Ramadan'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === id ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-primary/40'
            )}
          >
            {trn(label)}
          </button>
        ))}
      </nav>

      {tab === 'ramadan' ? (
        <div className="max-w-2xl space-y-4">
          {next && (
            <Card className="border-0 bg-brand-ink text-white">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-light">{tr('Ramadan {0}', [next.year])}</p>
                <p className="mt-1 font-display text-3xl font-bold">{tr('In {0} {1}', [next.daysAway, next.daysAway === 1 ? 'day' : 'days'])}</p>
                <p className="mt-1 text-sm text-white/80">
                  {tr('Around {0}, depending on the moon sighting', [parseISODate(next.start).toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' })])}
                </p>
              </CardContent>
            </Card>
          )}
          <MakeupCard />
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{tr('Next two months')}</p>
            {!days ? (
              <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {tr('Loading the Hijri dates…')}
              </p>
            ) : days.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">{trn(error) ?? tr('No Sunnah fasts found in the next two months.')}</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {days.map((d) => {
                  const date = parseISODate(d.date);
                  return (
                    <li key={`${d.date}-${d.title}`} className="flex items-center gap-4 py-3">
                      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-secondary py-1.5">
                        <span className="text-[10px] font-semibold uppercase text-primary">
                          {date.toLocaleDateString(locale(), { weekday: 'short' })}
                        </span>
                        <span className="font-display text-lg font-bold leading-tight text-foreground">{date.getDate()}</span>
                        <span className="text-[10px] text-muted-foreground">{date.toLocaleDateString(locale(), { month: 'short' })}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{d.date === today ? tr('Today · {0}', [d.title]) : tr(d.title)}</p>
                        <p className="text-sm text-muted-foreground">{trn(d.why)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="monthu" className="text-sm font-medium">
                    {tr('Include Mondays and Thursdays')}
                  </Label>
                  <p className="text-xs text-muted-foreground">{tr('The weekly Sunnah fasts.')}</p>
                </div>
                <Switch id="monthu" checked={monThu} onCheckedChange={changeMonThu} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="suhoor" className="text-sm font-medium">
                    {tr('Remind me for suhoor')}
                  </Label>
                  <p className="text-xs text-muted-foreground">{tr('The evening before each fast, while Firdam is open.')}</p>
                </div>
                <Switch
                  id="suhoor"
                  checked={reminders.fasting}
                  disabled={permission === 'unsupported' || permission === 'denied'}
                  onCheckedChange={(v) => update({ ...reminders, fasting: v })}
                />
              </div>
              <Link href="/settings?tab=notifications" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Bell className="h-3.5 w-3.5" /> {tr('All notifications')}
              </Link>
            </CardContent>
          </Card>
          <p className="px-1 text-xs text-muted-foreground">
            {tr('Islamic dates may differ by a day from your local moon sighting. No voluntary fasts are listed in Ramadan, on the Eids or the days of Tashreeq.')}
          </p>
        </div>
      </div>
      )}
    </AppShell>
  );
}
