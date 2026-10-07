'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { callEdgeFunction } from '@/lib/supabase/functions';
import {
  getDevicePosition,
  type SavedLocation,
} from '@/lib/geo/location';

interface LocationPickerProps {
  value: SavedLocation | null;
  onChange: (location: SavedLocation) => void;
  className?: string;
  placeholder?: string;
  /** Hide the "Use my location" button (e.g. when the page header has one). */
  hideLocateButton?: boolean;
}

/** Reverse-geocodes coordinates into "City, Country" via the prayer-times function. */
export async function labelForCoordinates(latitude: number, longitude: number): Promise<string> {
  try {
    const res = await callEdgeFunction<{ label?: string | null }>('prayer-times', {
      lat: latitude,
      lng: longitude,
      reverse: '1',
    });
    return res.label || 'Current location';
  } catch {
    return 'Current location';
  }
}

export async function locateDevice(): Promise<SavedLocation> {
  const { latitude, longitude } = await getDevicePosition();
  const label = await labelForCoordinates(latitude, longitude);
  return {
    id: -1,
    name: label,
    country: '',
    region: '',
    latitude,
    longitude,
    label,
  };
}

export function LocationPicker({
  value,
  onChange,
  className,
  placeholder = 'Search a city (e.g. Ottawa, London, Dubai)',
  hideLocateButton,
}: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SavedLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await callEdgeFunction<{ places?: SavedLocation[] }>(
          'prayer-times',
          { q },
          { signal: controller.signal }
        );
        setResults(res.places ?? []);
        setOpen(true);
      } catch {
        // ignore — the user can keep typing
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const useMyLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const loc = await locateDevice();
      onChange(loc);
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div ref={ref} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="pl-9"
            aria-label="Search for a city"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {open && results.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
              {results.map((place) => (
                <li key={`${place.id}-${place.label}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(place);
                      setQuery('');
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-foreground">{place.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!hideLocateButton && (
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
            {locating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="mr-2 h-4 w-4" />
            )}
            Use my location
          </Button>
        )}
      </div>
      {value && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          {value.label}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
