import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  Qibla,
  type CalculationParameters,
} from 'adhan';
import { useCallback, useEffect, useState } from 'react';

/**
 * Prayer times are calculated on the phone (no internet needed), so they and
 * the adhan alerts keep working offline. Same methods and defaults as firdam.com.
 */

export type PrayerId = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYERS: { id: PrayerId; name: string; arabic: string; alert: boolean }[] = [
  { id: 'fajr', name: 'Fajr', arabic: 'الفجر', alert: true },
  { id: 'sunrise', name: 'Sunrise', arabic: 'الشروق', alert: false },
  { id: 'dhuhr', name: 'Dhuhr', arabic: 'الظهر', alert: true },
  { id: 'asr', name: 'Asr', arabic: 'العصر', alert: true },
  { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب', alert: true },
  { id: 'isha', name: 'Isha', arabic: 'العشاء', alert: true },
];

export const METHODS: { id: string; name: string; region: string; params: () => CalculationParameters }[] = [
  { id: 'isna', name: 'ISNA', region: 'North America', params: () => CalculationMethod.NorthAmerica() },
  { id: 'moonsighting', name: 'Moonsighting Committee', region: 'Worldwide', params: () => CalculationMethod.MoonsightingCommittee() },
  { id: 'mwl', name: 'Muslim World League', region: 'Europe, Far East', params: () => CalculationMethod.MuslimWorldLeague() },
  { id: 'ummalqura', name: 'Umm al-Qura', region: 'Saudi Arabia', params: () => CalculationMethod.UmmAlQura() },
  { id: 'egyptian', name: 'Egyptian General Authority', region: 'Africa, Middle East', params: () => CalculationMethod.Egyptian() },
  { id: 'karachi', name: 'University of Islamic Sciences, Karachi', region: 'South Asia', params: () => CalculationMethod.Karachi() },
  { id: 'dubai', name: 'Dubai', region: 'UAE', params: () => CalculationMethod.Dubai() },
  { id: 'kuwait', name: 'Kuwait', region: 'Kuwait', params: () => CalculationMethod.Kuwait() },
  { id: 'qatar', name: 'Qatar', region: 'Qatar', params: () => CalculationMethod.Qatar() },
  { id: 'singapore', name: 'MUIS', region: 'Singapore', params: () => CalculationMethod.Singapore() },
  { id: 'turkey', name: 'Diyanet', region: 'Turkey', params: () => CalculationMethod.Turkey() },
];

export interface PrayerPlace {
  latitude: number;
  longitude: number;
  /** "Toronto", or "Your location" until the name is known. */
  label: string;
}

export interface PrayerSettings {
  method: string;
  /** Hanafi Asr is later than the standard (Shafi'i, Maliki, Hanbali) Asr. */
  hanafiAsr: boolean;
  /** Prayers with an adhan alert. Sunrise has none. */
  alerts: Record<PrayerId, boolean>;
  place: PrayerPlace | null;
}

export const DEFAULT_SETTINGS: PrayerSettings = {
  method: 'isna',
  hanafiAsr: false,
  alerts: { fajr: true, sunrise: false, dhuhr: true, asr: true, maghrib: true, isha: true },
  place: null,
};

const KEY = 'firdam.prayer.settings.v1';
type Listener = (s: PrayerSettings) => void;
const listeners = new Set<Listener>();
let cached: PrayerSettings | null = null;

export async function loadPrayerSettings(): Promise<PrayerSettings> {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PrayerSettings>) : {};
    cached = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      alerts: { ...DEFAULT_SETTINGS.alerts, ...(parsed.alerts ?? {}) },
    };
  } catch {
    cached = DEFAULT_SETTINGS;
  }
  return cached;
}

export async function savePrayerSettings(next: PrayerSettings): Promise<void> {
  cached = next;
  listeners.forEach((l) => l(next));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/** Prayer settings shared by every screen, saved on the phone. */
export function usePrayerSettings() {
  const [settings, setSettings] = useState<PrayerSettings | null>(cached);
  useEffect(() => {
    let alive = true;
    loadPrayerSettings().then((s) => alive && setSettings(s));
    const l: Listener = (s) => setSettings(s);
    listeners.add(l);
    return () => {
      alive = false;
      listeners.delete(l);
    };
  }, []);
  const update = useCallback(async (patch: Partial<PrayerSettings>) => {
    const current = await loadPrayerSettings();
    await savePrayerSettings({ ...current, ...patch });
  }, []);
  return { settings, update };
}

export function methodById(id: string) {
  return METHODS.find((m) => m.id === id) ?? METHODS[0];
}

function paramsFor(settings: PrayerSettings, coords: Coordinates): CalculationParameters {
  const params = methodById(settings.method).params();
  params.madhab = settings.hanafiAsr ? Madhab.Hanafi : Madhab.Shafi;
  // Canada and northern Europe: keeps Fajr and Isha sensible in summer.
  params.highLatitudeRule = HighLatitudeRule.recommended(coords);
  return params;
}

export interface DayTimes {
  date: Date;
  times: Record<PrayerId, Date>;
}

export function timesFor(settings: PrayerSettings, place: PrayerPlace, date: Date): DayTimes {
  const coords = new Coordinates(place.latitude, place.longitude);
  const pt = new PrayerTimes(coords, date, paramsFor(settings, coords));
  return {
    date,
    times: { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha },
  };
}

/** The next prayer from now (tomorrow's Fajr after Isha). Sunrise is skipped. */
export function nextPrayer(settings: PrayerSettings, place: PrayerPlace, now = new Date()): { id: PrayerId; at: Date } {
  const today = timesFor(settings, place, now);
  for (const p of PRAYERS) {
    if (!p.alert) continue;
    if (today.times[p.id] > now) return { id: p.id, at: today.times[p.id] };
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return { id: 'fajr', at: timesFor(settings, place, tomorrow).times.fajr };
}

export function qiblaDirection(place: PrayerPlace): number {
  return Qibla(new Coordinates(place.latitude, place.longitude));
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).replace('a.m.', 'am').replace('p.m.', 'pm');
}

export function formatCountdown(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `in ${m} min`;
  return `in ${h} h ${m} min`;
}

export function compassWord(deg: number): string {
  const words = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return words[Math.round(deg / 45) % 8];
}

/** Re-renders every 30 seconds so countdowns stay current. */
export function useNow(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
