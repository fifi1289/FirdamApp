'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { readSavedLocation } from '@/lib/geo/location';
import { fetchPrayerMonth, parseGregorian, DEFAULT_PRAYER_SETTINGS } from '@/lib/prayer/prayer';
import type { FamilyEvent, FamilyMember } from '@/types/database';
import { buildCalendarItems, iso, parseISODate, type CalendarItem as SharedItem, type HijriLabel } from '@/features/calendar/calendar-core';

export const FAMILY_EVENTS_CHANGED = 'family-events-changed';

export type CalendarItem = SharedItem<FamilyEvent>;
export type { HijriLabel };

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

  const items = useMemo(
    () => buildCalendarItems(events, members, hijri, parseISODate(startKey), parseISODate(endKey)),
    [events, members, hijri, startKey, endKey]
  );

  return { items, hijri, members, loading, reload: load };
}
