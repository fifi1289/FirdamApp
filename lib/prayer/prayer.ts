'use client';

import { useCallback, useEffect, useState } from 'react';

import { callEdgeFunction } from '@/lib/supabase/functions';

export interface PrayerTimings {
  Imsak: string;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

export interface PrayerDay {
  timings: PrayerTimings;
  gregorian: { date: string; weekday: string };
  hijri: {
    day: string;
    month: string;
    monthAr?: string | null;
    monthNumber?: number;
    year: string;
    weekday: string;
    holidays?: string[];
  };
  method?: string | null;
}

export type PrayerKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export const PRAYER_ORDER: { key: PrayerKey; label: string; arabic: string }[] = [
  { key: 'Fajr', label: 'Fajr', arabic: 'الفجر' },
  { key: 'Dhuhr', label: 'Dhuhr', arabic: 'الظهر' },
  { key: 'Asr', label: 'Asr', arabic: 'العصر' },
  { key: 'Maghrib', label: 'Maghrib', arabic: 'المغرب' },
  { key: 'Isha', label: 'Isha', arabic: 'العشاء' },
];

/** Calculation methods supported by the Aladhan API. */
export const CALCULATION_METHODS: { id: number; name: string; region: string }[] = [
  { id: 2, name: 'ISNA', region: 'North America' },
  { id: 15, name: 'Moonsighting Committee', region: 'Worldwide' },
  { id: 3, name: 'Muslim World League', region: 'Europe, Far East' },
  { id: 4, name: 'Umm al-Qura', region: 'Saudi Arabia' },
  { id: 5, name: 'Egyptian General Authority', region: 'Africa, Middle East' },
  { id: 1, name: 'University of Islamic Sciences, Karachi', region: 'South Asia' },
  { id: 8, name: 'Gulf Region', region: 'Gulf' },
  { id: 16, name: 'Dubai', region: 'UAE' },
  { id: 9, name: 'Kuwait', region: 'Kuwait' },
  { id: 10, name: 'Qatar', region: 'Qatar' },
  { id: 11, name: 'MUIS', region: 'Singapore' },
  { id: 17, name: 'JAKIM', region: 'Malaysia' },
  { id: 20, name: 'KEMENAG', region: 'Indonesia' },
  { id: 13, name: 'Diyanet', region: 'Turkey' },
  { id: 12, name: 'UOIF', region: 'France' },
  { id: 21, name: 'Morocco', region: 'Morocco' },
  { id: 14, name: 'Spiritual Administration of Muslims', region: 'Russia' },
];

export interface PrayerSettings {
  method: number;
  /** 0 = Shafi'i, Maliki, Hanbali (standard); 1 = Hanafi (later Asr) */
  school: 0 | 1;
}

const SETTINGS_KEY = 'firdam.prayer.settings';
const SETTINGS_EVENT = 'firdam-prayer-settings-changed';
export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = { method: 2, school: 0 };

function readSettings(): PrayerSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_PRAYER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PrayerSettings>;
    return {
      method: typeof parsed.method === 'number' ? parsed.method : DEFAULT_PRAYER_SETTINGS.method,
      school: parsed.school === 1 ? 1 : 0,
    };
  } catch {
    return DEFAULT_PRAYER_SETTINGS;
  }
}

export function usePrayerSettings() {
  const [settings, setSettings] = useState<PrayerSettings>(DEFAULT_PRAYER_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setReady(true);
    const sync = () => setSettings(readSettings());
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_EVENT, sync);
  }, []);

  const update = useCallback((next: PrayerSettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SETTINGS_EVENT));
    } catch {
      // storage unavailable
    }
  }, []);

  return { settings, ready, update };
}

/** Local calendar date as DD-MM-YYYY (the format Aladhan expects). */
export function localDatePath(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

export function fetchPrayerDay(
  lat: number,
  lng: number,
  settings: PrayerSettings,
  date: Date = new Date()
): Promise<PrayerDay> {
  return callEdgeFunction<PrayerDay>('prayer-times', {
    lat,
    lng,
    date: localDatePath(date),
    method: settings.method,
    school: settings.school,
  });
}

export async function fetchPrayerMonth(
  lat: number,
  lng: number,
  settings: PrayerSettings,
  period: { month: number; year: number } | { hijriMonth: number; hijriYear: number }
): Promise<PrayerDay[]> {
  const res = await callEdgeFunction<{ days: PrayerDay[] }>('prayer-times', {
    lat,
    lng,
    method: settings.method,
    school: settings.school,
    ...('month' in period
      ? { month: period.month, year: period.year }
      : { hijriMonth: period.hijriMonth, hijriYear: period.hijriYear }),
  });
  return res.days;
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

export function timeOnDate(t: string, base: Date = new Date()): Date {
  const d = new Date(base);
  const mins = toMinutes(t);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

export function format12h(t: string): string {
  if (!t) return '—';
  const mins = toMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${period}`;
}

export interface CurrentPrayer {
  currentKey: PrayerKey | null;
  nextKey: PrayerKey;
  nextDate: Date;
  isNextTomorrow: boolean;
}

export function computeCurrentPrayer(timings: PrayerTimings, now: Date): CurrentPrayer {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const prayers = PRAYER_ORDER.map((p) => ({ key: p.key, min: toMinutes(timings[p.key]) }));

  let currentKey: PrayerKey | null = null;
  for (const p of prayers) if (nowMin >= p.min) currentKey = p.key;

  const upcoming = prayers.find((p) => p.min > nowMin);
  if (upcoming) {
    return {
      currentKey,
      nextKey: upcoming.key,
      nextDate: timeOnDate(timings[upcoming.key], now),
      isNextTomorrow: false,
    };
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    // After Isha and before midnight, Isha is still current.
    currentKey: 'Isha',
    nextKey: 'Fajr',
    nextDate: timeOnDate(timings.Fajr, tomorrow),
    isNextTomorrow: true,
  };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "in 2h 15m" style. */
export function formatRelative(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `in ${m} min`;
  return `in ${h}h ${String(m).padStart(2, '0')}m`;
}

/** Parse Aladhan's DD-MM-YYYY into a local Date. */
export function parseGregorian(date: string): Date {
  const [dd, mm, yyyy] = date.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}
