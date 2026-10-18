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
import { iso, parseISODate, sunnahFastingDays, type FastingDay, type HijriLabel } from '@/features/calendar/calendar-core';

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
        month: d.hijri.month,
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
          setError('Could not load the Hijri dates. Check your connection and refresh the page.');
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
        title="Fasting"
        description="The Sunnah fasts coming up: Arafah, Ashura, the white days of each month and the six days of Shawwal. Ramadan comes here too, in sha Allah."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Next two months</p>
            {!days ? (
              <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading the Hijri dates…
              </p>
            ) : days.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">{error ?? 'No Sunnah fasts found in the next two months.'}</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {days.map((d) => {
                  const date = parseISODate(d.date);
                  return (
                    <li key={`${d.date}-${d.title}`} className="flex items-center gap-4 py-3">
                      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-secondary py-1.5">
                        <span className="text-[10px] font-semibold uppercase text-primary">
                          {date.toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                        <span className="font-display text-lg font-bold leading-tight text-foreground">{date.getDate()}</span>
                        <span className="text-[10px] text-muted-foreground">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{d.date === today ? `Today · ${d.title}` : d.title}</p>
                        <p className="text-sm text-muted-foreground">{d.why}</p>
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
                    Include Mondays and Thursdays
                  </Label>
                  <p className="text-xs text-muted-foreground">The weekly Sunnah fasts.</p>
                </div>
                <Switch id="monthu" checked={monThu} onCheckedChange={changeMonThu} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="suhoor" className="text-sm font-medium">
                    Remind me for suhoor
                  </Label>
                  <p className="text-xs text-muted-foreground">The evening before each fast, while Firdam is open.</p>
                </div>
                <Switch
                  id="suhoor"
                  checked={reminders.fasting}
                  disabled={permission === 'unsupported' || permission === 'denied'}
                  onCheckedChange={(v) => update({ ...reminders, fasting: v })}
                />
              </div>
              <Link href="/settings?tab=notifications" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Bell className="h-3.5 w-3.5" /> All notifications
              </Link>
            </CardContent>
          </Card>
          <p className="px-1 text-xs text-muted-foreground">
            Islamic dates may differ by a day from your local moon sighting. No voluntary fasts are listed in Ramadan, on the Eids or the days of
            Tashreeq.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
