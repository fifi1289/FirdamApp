'use client';

import { useEffect } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { readSavedLocation } from '@/lib/geo/location';
import {
  PRAYER_ORDER,
  fetchPrayerDay,
  format12h,
  timeOnDate,
  usePrayerSettings,
} from '@/lib/prayer/prayer';
import { notifyOnce, useReminderSettings } from '@/lib/reminders/reminders';
import { sunnahFastingDays, type HijriLabel } from '@/features/calendar/calendar-core';

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Same month/day this year (for yearly events). */
function sameDayThisYear(base: string, year: number): string {
  const [, m, d] = base.split('-');
  return `${year}-${m}-${d}`;
}

/**
 * Schedules prayer and family-event reminders while the app is open.
 * Renders nothing.
 */
export function ReminderManager() {
  const { settings } = useReminderSettings();
  const { settings: prayerSettings, ready } = usePrayerSettings();

  // Prayer reminders
  useEffect(() => {
    if (!settings.prayers || !ready) return;
    const location = readSavedLocation();
    if (!location) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    fetchPrayerDay(location.latitude, location.longitude, prayerSettings)
      .then((day) => {
        if (cancelled) return;
        const now = new Date();
        const today = isoDay(now);
        for (const p of PRAYER_ORDER) {
          if (!day.timings[p.key]) continue;
          const at = timeOnDate(day.timings[p.key], now);
          const fireAt = at.getTime() - settings.prayerLeadMinutes * 60_000;
          const delay = fireAt - now.getTime();
          if (delay < -60_000 || delay > 24 * 3600_000) continue;
          const isJumuah = p.key === 'Dhuhr' && now.getDay() === 5;
          const name = isJumuah ? "Jumu'ah" : p.label;
          timers.push(
            setTimeout(
              () =>
                notifyOnce(
                  `prayer-${today}-${p.key}`,
                  settings.prayerLeadMinutes > 0
                    ? `${name} in ${settings.prayerLeadMinutes} minutes`
                    : `It's time for ${name}`,
                  `${name} is at ${format12h(day.timings[p.key])} in ${location.name || 'your area'}.`
                ),
              Math.max(0, delay)
            )
          );
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [settings.prayers, settings.prayerLeadMinutes, prayerSettings, ready]);

  // Family event reminders (today and tomorrow)
  useEffect(() => {
    if (!settings.events) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    const now = new Date();
    const today = isoDay(now);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = isoDay(tomorrowDate);

    Promise.all([supabase.from('family_events').select('id,title,starts_on,repeats_yearly,repeats_weekly,start_time')]).then(([events]) => {
      if (cancelled) return;
      const check = (id: string, title: string, base: string, yearly: boolean, weekly = false) => {
        for (const [date, label] of [
          [today, 'Today'],
          [tomorrow, 'Tomorrow'],
        ] as const) {
          const match = weekly
            ? date >= base && (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${base}T12:00:00Z`)) % (7 * 86_400_000) === 0
            : yearly
              ? sameDayThisYear(base, Number(date.slice(0, 4))) === date
              : base === date;
          if (match) notifyOnce(`event-${id}-${date}-${label}`, `${label}: ${title}`, 'From your family calendar');
        }
      };
      for (const e of events.data ?? []) check(e.id, e.title, e.starts_on, e.repeats_yearly, e.repeats_weekly);
    });

    return () => {
      cancelled = true;
    };
  }, [settings.events]);

  // Suhoor reminder: the evening before a Sunnah fast (from 8 pm, while the site is open).
  useEffect(() => {
    if (!settings.fasting || !ready) return;
    const location = readSavedLocation();
    const lat = location?.latitude ?? 21.4225;
    const lng = location?.longitude ?? 39.8262;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    let monThu = false;
    try {
      monThu = Boolean((JSON.parse(window.localStorage.getItem('firdam.fasting') ?? '{}') as { mondaysThursdays?: boolean }).mondaysThursdays);
    } catch {
      // ignore
    }
    fetchPrayerDay(lat, lng, prayerSettings, tomorrow)
      .then((day) => {
        if (cancelled) return;
        const key = isoDay(tomorrow);
        const hijri = new Map<string, HijriLabel>([
          [key, { day: Number(day.hijri.day), month: day.hijri.month, monthNumber: day.hijri.monthNumber ?? 0, year: Number(day.hijri.year) }],
        ]);
        const fast = sunnahFastingDays(hijri, tomorrow, tomorrow, { sunnahFasts: true, mondaysThursdays: monThu })[0];
        if (!fast) return;
        const eight = new Date(now);
        eight.setHours(20, 0, 0, 0);
        timer = setTimeout(
          () => notifyOnce(`fast-${key}`, `Fast tomorrow: ${fast.title}`, 'Remember your suhoor. May Allah accept it from you.'),
          Math.max(0, eight.getTime() - Date.now())
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [settings.fasting, prayerSettings, ready]);

  return null;
}
