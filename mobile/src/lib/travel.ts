import type { ChecklistItem, Trip, TripKind } from '@/lib/db-types';
import { callFunction } from '@/lib/functions';
import type { PrayerSettings } from '@/lib/prayer';
import { supabase } from '@/lib/supabase';
import { TRIP_KIND_LABELS, defaultChecklist } from '@/shared/travel-data';

/** Travel: the family's trips, the same `trips` table as firdam.com. */
export async function loadTrips(): Promise<Trip[]> {
  const { data, error } = await supabase.from('trips').select('*').order('start_date', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Trip[];
}

export async function loadTrip(id: string): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Trip | null) ?? null;
}

export interface TripInput {
  name: string;
  kind: TripKind;
  destination: { label: string; latitude: number; longitude: number };
  start: string;
  end: string;
  travellers: number;
  budget: string;
  notes: string;
}

/** Creates or updates a trip and returns its id. New trips get the packing list for their kind. */
export async function saveTrip(input: TripInput, existing?: Trip | null): Promise<string> {
  const people = Math.max(1, Math.min(50, Math.round(input.travellers) || 1));
  const place = input.destination.label.split(',')[0].trim() || input.destination.label;
  const row = {
    name: input.name.trim() || `${TRIP_KIND_LABELS[input.kind]} — ${place}`,
    kind: input.kind,
    destination_label: input.destination.label,
    latitude: input.destination.latitude,
    longitude: input.destination.longitude,
    start_date: input.start || null,
    end_date: input.end || null,
    travellers: people,
    budget: input.budget.trim() ? Number(input.budget.replace(',', '.')) || null : null,
    notes: input.notes.trim() || null,
  };
  const result = existing
    ? await supabase.from('trips').update({ ...row, updated_at: new Date().toISOString() }).eq('id', existing.id).select('id').single()
    : await supabase.from('trips').insert({ ...row, checklist: defaultChecklist(input.kind, people) }).select('id').single();
  if (result.error) throw new Error(result.error.message);
  return (result.data as { id: string }).id;
}

export async function saveChecklist(id: string, checklist: ChecklistItem[]): Promise<void> {
  const { error } = await supabase.from('trips').update({ checklist, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** AlAdhan method numbers for the app's calculation methods (the website's prayer-times function uses them). */
const ALADHAN_METHOD: Record<string, number> = {
  karachi: 1,
  isna: 2,
  mwl: 3,
  ummalqura: 4,
  egyptian: 5,
  kuwait: 9,
  qatar: 10,
  singapore: 11,
  turkey: 13,
  moonsighting: 15,
  dubai: 16,
};

export interface DestinationDay {
  /** "HH:MM" in the destination's own time. */
  timings: Record<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', string>;
  gregorian: { date: string; weekday: string };
}

/**
 * Prayer times at the destination, in its local time (the phone's own clock
 * may be in another time zone, so these come from the server, like on the website).
 */
export function destinationPrayerDay(trip: Trip, settings: PrayerSettings, day: Date): Promise<DestinationDay> {
  const date = `${String(day.getDate()).padStart(2, '0')}-${String(day.getMonth() + 1).padStart(2, '0')}-${day.getFullYear()}`;
  return callFunction<DestinationDay>('prayer-times', {
    lat: trip.latitude.toFixed(4),
    lng: trip.longitude.toFixed(4),
    date,
    method: ALADHAN_METHOD[settings.method] ?? 2,
    school: settings.hanafiAsr ? 1 : 0,
  });
}

export interface NearbyAgency {
  key: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  muslimFocused: boolean;
}

/** Travel agencies on the map around a place (OpenStreetMap, via the halal-places function). */
export async function nearbyAgencies(lat: number, lng: number, radiusKm: number): Promise<NearbyAgency[]> {
  const r = await callFunction<{ agencies: NearbyAgency[] }>('halal-places', {
    kind: 'travel',
    lat: lat.toFixed(5),
    lng: lng.toFixed(5),
    radius: radiusKm * 1000,
  });
  return r.agencies ?? [];
}

/** Straight-line distance in km. */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
