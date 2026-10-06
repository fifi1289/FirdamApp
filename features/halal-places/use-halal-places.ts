'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { callEdgeFunction } from '@/lib/supabase/functions';
import { distanceKm } from '@/lib/geo/location';
import type { HalalPlaceRecord } from '@/types/database';
import type { HalalPlace, PlaceRating } from '@/features/halal-places/types';

export const HALAL_PLACES_CHANGED = 'halal-places-changed';

interface OsmResponse {
  places: Omit<HalalPlace, 'distanceKm'>[];
}

export function communityToPlace(r: HalalPlaceRecord): HalalPlace {
  return {
    key: `community:${r.id}`,
    source: 'community',
    name: r.name,
    category: r.category,
    latitude: r.latitude,
    longitude: r.longitude,
    address: [r.address, r.city, r.country].filter(Boolean).join(', ') || null,
    phone: r.phone,
    website: r.website,
    openingHours: null,
    halalStatus: r.category === 'mosque' ? 'mosque' : r.halal_status,
    certification: r.certification,
    cuisine: null,
    notes: r.notes,
    ownerId: r.user_id,
  };
}

/** Removes OSM entries that a community place duplicates (same name, < 80 m). */
function dedupe(places: HalalPlace[]): HalalPlace[] {
  const community = places.filter((p) => p.source === 'community');
  return places.filter((p) => {
    if (p.source === 'community') return true;
    const name = p.name.trim().toLowerCase();
    return !community.some(
      (c) => c.name.trim().toLowerCase() === name && distanceKm(c, p) < 0.08
    );
  });
}

export function useHalalPlaces(
  center: { latitude: number; longitude: number } | null,
  radiusKm: number
) {
  const supabase = createSupabaseBrowserClient();
  const [places, setPlaces] = useState<HalalPlace[]>([]);
  const [ratings, setRatings] = useState<Record<string, PlaceRating>>({});
  const [loading, setLoading] = useState(false);
  const [osmError, setOsmError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(HALAL_PLACES_CHANGED, bump);
    return () => window.removeEventListener(HALAL_PLACES_CHANGED, bump);
  }, []);

  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    const { latitude, longitude } = center;
    setLoading(true);
    setOsmError(null);

    const dLat = radiusKm / 111;
    const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)));

    const osmPromise = callEdgeFunction<OsmResponse>('halal-places', {
      lat: latitude.toFixed(5),
      lng: longitude.toFixed(5),
      radius: Math.round(radiusKm * 1000),
    })
      .then((r) => r.places.map((p) => ({ ...p, source: 'osm' as const })))
      .catch((err: unknown) => {
        if (!cancelled) {
          setOsmError(
            err instanceof Error ? err.message : 'Map data is temporarily unavailable.'
          );
        }
        return [] as HalalPlace[];
      });

    const communityPromise = supabase
      .from('halal_places')
      .select('*')
      .gte('latitude', latitude - dLat)
      .lte('latitude', latitude + dLat)
      .gte('longitude', longitude - dLng)
      .lte('longitude', longitude + dLng)
      .limit(300)
      .then(({ data, error }) => {
        if (error) console.error('Failed to load community places:', error.message);
        return (data ?? []).map(communityToPlace);
      });

    Promise.all([osmPromise, communityPromise]).then(async ([osm, community]) => {
      if (cancelled) return;
      const merged = dedupe([...community, ...osm])
        .map((p) => ({ ...p, distanceKm: distanceKm(center, p) }))
        .filter((p) => (p.distanceKm ?? 0) <= radiusKm * 1.05)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      setPlaces(merged);
      setLoading(false);

      const keys = merged.slice(0, 250).map((p) => p.key);
      if (keys.length === 0) {
        setRatings({});
        return;
      }
      const { data, error } = await supabase.rpc('halal_place_ratings', { keys });
      if (cancelled) return;
      if (error) {
        console.error('Failed to load ratings:', error.message);
        return;
      }
      const map: Record<string, PlaceRating> = {};
      for (const row of data ?? []) {
        map[row.place_key] = {
          avgRating: Number(row.avg_rating),
          reviewCount: Number(row.review_count),
          confirmations: Number(row.confirmations),
          disputes: Number(row.disputes),
        };
      }
      setRatings(map);
    });

    return () => {
      cancelled = true;
    };
    // `center` is compared by value to avoid refetching on identical objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.latitude, center?.longitude, radiusKm, version, supabase]);

  return { places, ratings, loading, osmError };
}

/** The signed-in user's saved (favourite) places. */
export function useSavedPlaces() {
  const supabase = createSupabaseBrowserClient();
  const [saved, setSaved] = useState<Map<string, HalalPlace>>(new Map());

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('saved_halal_places')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load saved places:', error.message);
      return;
    }
    const map = new Map<string, HalalPlace>();
    for (const row of data ?? []) {
      map.set(row.place_key, row.snapshot as unknown as HalalPlace);
    }
    setSaved(map);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (place: HalalPlace) => {
      if (saved.has(place.key)) {
        const next = new Map(saved);
        next.delete(place.key);
        setSaved(next);
        const { error } = await supabase
          .from('saved_halal_places')
          .delete()
          .eq('place_key', place.key);
        if (error) {
          await load();
          throw error;
        }
        return false;
      }
      const next = new Map(saved);
      next.set(place.key, place);
      setSaved(next);
      const { distanceKm: _d, ...snapshot } = place;
      void _d;
      const { error } = await supabase.from('saved_halal_places').insert({
        place_key: place.key,
        snapshot: snapshot as unknown as Record<string, unknown>,
      });
      if (error) {
        await load();
        throw error;
      }
      return true;
    },
    [saved, supabase, load]
  );

  const list = useMemo(() => Array.from(saved.values()), [saved]);
  return { saved, list, toggle };
}
