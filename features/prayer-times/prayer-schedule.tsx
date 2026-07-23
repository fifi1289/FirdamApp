'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Search,
  LocateFixed,
  Sunrise,
  Clock,
  Loader2,
  CalendarDays,
  Navigation,
} from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface PrayerData {
  timings: PrayerTimings;
  gregorian: { date: string; weekday: string };
  hijri: { day: string; month: string; year: string; weekday: string };
}

interface Place {
  id: number;
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  label: string;
}

type GeoStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';

const PRAYER_ORDER: { key: keyof PrayerTimings; label: string }[] = [
  { key: 'Fajr', label: 'Fajr' },
  { key: 'Dhuhr', label: 'Dhuhr' },
  { key: 'Asr', label: 'Asr' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isha' },
];

const LOC_KEY = 'firdam.prayer.location';

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function parseTime(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function format12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${period}`;
}

interface CurrentInfo {
  currentKey: keyof PrayerTimings | null;
  nextKey: keyof PrayerTimings;
  nextDate: Date;
  isNextTomorrow: boolean;
}

function computeCurrent(timings: PrayerTimings, now: Date): CurrentInfo {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const prayers = PRAYER_ORDER.map((p) => ({
    key: p.key,
    min: toMinutes(timings[p.key]),
  }));

  let currentKey: keyof PrayerTimings | null = null;
  for (const p of prayers) {
    if (nowMin >= p.min) currentKey = p.key;
  }

  const upcoming = prayers.find((p) => p.min > nowMin);
  if (upcoming) {
    return {
      currentKey,
      nextKey: upcoming.key,
      nextDate: parseTime(timings[upcoming.key]),
      isNextTomorrow: false,
    };
  }

  const fajrMin = toMinutes(timings.Fajr);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(Math.floor(fajrMin / 60), fajrMin % 60, 0, 0);
  return {
    currentKey: 'Isha',
    nextKey: 'Fajr',
    nextDate: tomorrow,
    isNextTomorrow: true,
  };
}

function formatRemaining(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}h ${m
    .toString()
    .padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

function GregorianLabel({ gregorian }: { gregorian: PrayerData['gregorian'] }) {
  const d = new Date(`${gregorian.date}T00:00:00`);
  const formatted = d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return <span>{formatted}</span>;
}

export function PrayerSchedule() {
  const supabase = createSupabaseBrowserClient();
  const [data, setData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('prompt');
  const [activePlace, setActivePlace] = useState<Place | null>(null);

  const [cityInput, setCityInput] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPrayers = useCallback(
    async (lat: number, lng: number, place?: Place) => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Please sign in to view prayer times.');
          setLoading(false);
          return;
        }
        const qs = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
        }).toString();
        const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/prayer-times?${qs}`;
        const res = await fetch(functionUrl, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        });
        if (!res.ok) {
          setError(`Could not load prayer times (${res.status}).`);
          setLoading(false);
          return;
        }
        const result = (await res.json()) as PrayerData;
        if (!result || !result.timings) {
          setError('Received an unexpected response. Please try again.');
          setLoading(false);
          return;
        }
        setData(result);
        if (place) {
          setActivePlace(place);
          localStorage.setItem(LOC_KEY, JSON.stringify(place));
        }
        setLoading(false);
      } catch {
        setError('Something went wrong while loading prayer times.');
        setLoading(false);
      }
    },
    [supabase]
  );

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unavailable');
      setLoading(false);
      return;
    }
    setGeoStatus('prompt');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeoStatus('granted');
        const place: Place = {
          id: -1,
          name: 'Current location',
          country: '',
          region: '',
          latitude,
          longitude,
          label: 'Current location',
        };
        fetchPrayers(latitude, longitude, place);
      },
      () => {
        setGeoStatus('denied');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchPrayers]);

  useEffect(() => {
    const saved = localStorage.getItem(LOC_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Place;
        if (
          typeof parsed.latitude === 'number' &&
          typeof parsed.longitude === 'number'
        ) {
          setActivePlace(parsed);
          fetchPrayers(parsed.latitude, parsed.longitude);
          return;
        }
      } catch {
        // ignore malformed entry
      }
    }
    requestGeolocation();
  }, [requestGeolocation, fetchPrayers]);

  // Debounced city search
  useEffect(() => {
    if (!cityInput.trim() || cityInput.trim().length < 2) {
      setPlaces([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const qs = new URLSearchParams({ q: cityInput.trim() }).toString();
        const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/prayer-times?${qs}`;
        const res = await fetch(functionUrl, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        });
        if (!res.ok) return;
        const json = (await res.json()) as { places?: Place[] };
        setPlaces(json.places ?? []);
        setShowDropdown(true);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [cityInput, supabase]);

  const handleSelectPlace = (place: Place) => {
    setCityInput(place.label);
    setShowDropdown(false);
    fetchPrayers(place.latitude, place.longitude, place);
  };

  const current = data ? computeCurrent(data.timings, now) : null;
  const remainingMs = current ? current.nextDate.getTime() - now.getTime() : 0;
  const showCitySearch = geoStatus === 'denied' || geoStatus === 'unavailable' || !!activePlace;

  return (
    <AppShell>
      <PageHeader
        title="Prayer Times"
        description="Today's prayer schedule based on your location."
      >
        <Button variant="outline" size="sm" onClick={requestGeolocation} disabled={loading}>
          <LocateFixed className="mr-2 h-4 w-4" />
          Use my location
        </Button>
      </PageHeader>

      {showCitySearch && (
        <div ref={searchRef} className="relative mb-4 max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Search your city (e.g. London, Istanbul, Cairo)"
              className="pl-9"
              onFocus={() => places.length > 0 && setShowDropdown(true)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {showDropdown && places.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-foreground">{place.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activePlace && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {activePlace.label}
        </p>
      )}

      {geoStatus === 'denied' && !activePlace && !loading && (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 py-4">
            <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Location permission denied
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Search for your city above to see today&apos;s prayer schedule.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading prayer times…
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-medium text-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={requestGeolocation}>
              <LocateFixed className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && current && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-brand-dark to-brand-mid px-6 py-5 text-primary-foreground">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm opacity-90">
                <CalendarDays className="h-4 w-4" />
                <GregorianLabel gregorian={data.gregorian} />
              </div>
              <p className="text-sm font-medium opacity-90">
                {data.hijri.day} {data.hijri.month} {data.hijri.year} AH
                <span className="mx-1.5 opacity-50">·</span>
                {data.hijri.weekday}
              </p>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Next prayer
              </p>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-lg font-semibold text-foreground">
                  {current.nextKey}
                  {current.isNextTomorrow && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      tomorrow
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-1.5 font-mono text-base font-medium tabular-nums text-primary">
                  <Clock className="h-4 w-4" />
                  {formatRemaining(remainingMs)}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-border">
              {PRAYER_ORDER.map((p) => {
                const isCurrent = current.currentKey === p.key;
                return (
                  <li
                    key={p.key}
                    className={cn(
                      'flex items-center justify-between py-3.5 transition-colors',
                      isCurrent && '-mx-3 rounded-lg bg-primary/10 px-3'
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
                          'text-sm font-medium',
                          isCurrent ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {p.label}
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

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Sunrise className="h-3.5 w-3.5" />
              Sunrise at {format12h(data.timings.Sunrise)}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !data && geoStatus !== 'prompt' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Find your city</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Search for your city above to see today&apos;s prayer schedule.
            </p>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
