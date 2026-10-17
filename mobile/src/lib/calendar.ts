import AsyncStorage from '@react-native-async-storage/async-storage';

import { callFunction } from './functions';
import { loadPrayerSettings } from './prayer';
import { supabase } from './supabase';
import { iso, type CalendarEventKind, type CalendarEventRow, type CalendarMemberRow, type FastingOptions, type HijriLabel } from '@/shared/calendar-core';

/** Same tables as the website's Family calendar, so events show up in both. */
export type FamilyEvent = CalendarEventRow;

export async function loadEvents(): Promise<FamilyEvent[]> {
  const { data, error } = await supabase.from('family_events').select('*').order('starts_on', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FamilyEvent[];
}

export async function loadMembers(): Promise<CalendarMemberRow[]> {
  const { data, error } = await supabase.from('family_members').select('id, first_name, birth_date');
  if (error) throw error;
  return (data ?? []) as CalendarMemberRow[];
}

export interface EventDraft {
  title: string;
  kind: CalendarEventKind;
  starts_on: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  member_ids: string[];
  repeats_yearly: boolean;
  repeats_weekly: boolean;
}

export async function saveEvent(draft: EventDraft, id?: string): Promise<void> {
  const row = { ...draft, updated_at: new Date().toISOString() };
  const { error } = id ? await supabase.from('family_events').update(row).eq('id', id) : await supabase.from('family_events').insert(row);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('family_events').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Hijri dates (same source as the website) ----------

interface PrayerDay {
  gregorian: { date: string };
  hijri: { day: string; month: string; monthNumber?: number; year: string };
}

const hijriCache = new Map<string, Promise<[string, HijriLabel][]>>();

/** Hijri labels for every day of a Gregorian month, keyed by YYYY-MM-DD. */
export async function loadHijriMonth(year: number, month: number): Promise<Map<string, HijriLabel>> {
  const key = `${year}-${month}`;
  let entry = hijriCache.get(key);
  if (!entry) {
    entry = (async () => {
      const place = (await loadPrayerSettings().catch(() => null))?.place;
      const res = await callFunction<{ days: PrayerDay[] }>('prayer-times', {
        lat: place?.latitude ?? 21.4225,
        lng: place?.longitude ?? 39.8262,
        method: 2,
        school: 0,
        month,
        year,
      });
      return res.days.map((d): [string, HijriLabel] => {
        const [dd, mm, yyyy] = d.gregorian.date.split('-').map(Number);
        return [
          iso(new Date(yyyy!, mm! - 1, dd!)),
          { day: Number(d.hijri.day), month: d.hijri.month, monthNumber: d.hijri.monthNumber ?? 0, year: Number(d.hijri.year) },
        ];
      });
    })();
    hijriCache.set(key, entry);
    entry.catch(() => hijriCache.delete(key));
  }
  return new Map(await entry);
}

// ---------- Choices kept on this phone ----------

const FASTING_KEY = 'firdam.calendar.fasting';
const REMINDERS_KEY = 'firdam.calendar.reminders';

export async function getFastingOptions(): Promise<FastingOptions> {
  try {
    return JSON.parse((await AsyncStorage.getItem(FASTING_KEY)) ?? '{}') as FastingOptions;
  } catch {
    return {};
  }
}

export async function setFastingOptions(o: FastingOptions): Promise<void> {
  await AsyncStorage.setItem(FASTING_KEY, JSON.stringify(o)).catch(() => {});
}

/** Event reminders are on unless the family turned them off. */
export async function getRemindersOn(): Promise<boolean> {
  return (await AsyncStorage.getItem(REMINDERS_KEY).catch(() => null)) !== 'off';
}

export async function setRemindersOn(on: boolean): Promise<void> {
  await AsyncStorage.setItem(REMINDERS_KEY, on ? 'on' : 'off').catch(() => {});
}
