'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { readSavedLocation } from '@/lib/geo/location';
import { fetchPrayerMonth, parseGregorian, DEFAULT_PRAYER_SETTINGS } from '@/lib/prayer/prayer';
import type { FamilyEvent, FamilyEventKind, FamilyMember } from '@/types/database';
import { ISLAMIC_DATES, iso, parseISODate } from '@/features/calendar/calendar-config';

export const FAMILY_EVENTS_CHANGED = 'family-events-changed';

export interface CalendarItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: FamilyEventKind;
  source: 'event' | 'birthday' | 'islamic';
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  event?: FamilyEvent;
  memberNames?: string[];
}

export interface HijriLabel {
  day: number;
  month: string;
  monthNumber: number;
  year: number;
}

/** Expand yearly-repeating and one-off items into concrete dates within [start, end]. */
function occurrences(base: string, repeats: boolean, start: Date, end: Date): string[] {
  const first = parseISODate(base);
  if (!repeats) {
    return first >= start && first <= end ? [base] : [];
  }
  const out: string[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    // Feb 29 falls back to Feb 28 in non-leap years.
    const d = new Date(y, first.getMonth(), first.getDate());
    if (d.getMonth() !== first.getMonth()) d.setDate(0);
    if (d >= start && d <= end && d >= new Date(first.getFullYear(), first.getMonth(), first.getDate())) {
      out.push(iso(d));
    }
  }
  return out;
}

export function useCalendarData(rangeStart: Date, rangeEnd: Date) {
  const supabase = createSupabaseBrowserClient();
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [hijri, setHijri] = useState<Map<string, HijriLabel>>(new Map());
  const [loading, setLoading] = useState(true);

  const startKey = iso(rangeStart);
  const endKey = iso(rangeEnd);

  const load = useCallback(async () => {
    const [{ data: ev, error: evErr }, { data: mem, error: memErr }] = await Promise.all([
      supabase.from('family_events').select('*').order('starts_on', { ascending: true }),
      supabase.from('family_members').select('*'),
    ]);
    if (evErr) console.error('Failed to load events:', evErr.message);
    if (memErr) console.error('Failed to load family members:', memErr.message);
    setEvents(ev ?? []);
    setMembers(mem ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener(FAMILY_EVENTS_CHANGED, handler);
    return () => window.removeEventListener(FAMILY_EVENTS_CHANGED, handler);
  }, [load]);

  // Hijri dates for every month the range touches (for labels and Islamic dates).
  useEffect(() => {
    let cancelled = false;
    const loc = readSavedLocation();
    const lat = loc?.latitude ?? 21.4225;
    const lng = loc?.longitude ?? 39.8262;
    const months: { month: number; year: number }[] = [];
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor <= rangeEnd && months.length < 4) {
      months.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    Promise.all(
      months.map((m) =>
        fetchPrayerMonth(lat, lng, DEFAULT_PRAYER_SETTINGS, m).catch(() => [])
      )
    ).then((results) => {
      if (cancelled) return;
      const map = new Map<string, HijriLabel>();
      for (const days of results) {
        for (const d of days) {
          map.set(iso(parseGregorian(d.gregorian.date)), {
            day: Number(d.hijri.day),
            month: d.hijri.month,
            monthNumber: d.hijri.monthNumber ?? 0,
            year: Number(d.hijri.year),
          });
        }
      }
      setHijri(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, endKey]);

  const items = useMemo(() => {
    const start = parseISODate(startKey);
    const end = parseISODate(endKey);
    const memberName = new Map(members.map((m) => [m.id, m.first_name]));
    const out: CalendarItem[] = [];

    for (const e of events) {
      for (const date of occurrences(e.starts_on, e.repeats_yearly, start, end)) {
        out.push({
          id: `${e.id}:${date}`,
          date,
          title: e.title,
          kind: e.kind,
          source: 'event',
          startTime: e.start_time,
          endTime: e.end_time,
          location: e.location,
          event: e,
          memberNames: e.member_ids.map((id) => memberName.get(id)).filter(Boolean) as string[],
        });
      }
    }

    for (const m of members) {
      if (!m.birth_date) continue;
      const born = parseISODate(m.birth_date);
      for (const date of occurrences(m.birth_date, true, start, end)) {
        const age = parseISODate(date).getFullYear() - born.getFullYear();
        out.push({
          id: `birthday:${m.id}:${date}`,
          date,
          title: age > 0 ? `${m.first_name}'s birthday (${age})` : `${m.first_name} was born`,
          kind: 'birthday',
          source: 'birthday',
        });
      }
    }

    hijri.forEach((h, date) => {
      const special = ISLAMIC_DATES.find((s) => s.month === h.monthNumber && s.day === h.day);
      if (special) {
        out.push({
          id: `islamic:${date}`,
          date,
          title: special.title,
          kind: 'islamic',
          source: 'islamic',
        });
      }
    });

    out.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
        a.title.localeCompare(b.title)
    );
    return out;
  }, [events, members, hijri, startKey, endKey]);

  return { items, hijri, members, loading, reload: load };
}
