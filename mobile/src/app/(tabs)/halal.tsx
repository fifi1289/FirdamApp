import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Badge, Chip } from '@/components/kitchen-ui';
import { PlacesMap, type MapPin } from '@/components/places-map';
import { TabScreen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { callFunction } from '@/lib/functions';
import { placeFromDevice } from '@/lib/location';
import { usePrayerSettings } from '@/lib/prayer';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

type Category = 'grocery' | 'butcher' | 'restaurant' | 'cafe' | 'mosque' | 'other';
interface Place {
  key: string;
  name: string;
  category: Category;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  openingHours: string | null;
  halalStatus: 'halal' | 'halal_only' | 'halal_options' | 'mosque' | 'may_sell';
  cuisine: string | null;
  /** Added by Firdam families on the website. */
  community?: boolean;
}

const FILTERS: { key: 'all' | Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'butcher', label: 'Butchers' },
  { key: 'grocery', label: 'Groceries' },
  { key: 'mosque', label: 'Mosques' },
];

const STATUS: Record<Place['halalStatus'], { label: string; tone: 'sage' | 'amber' | 'walnut' }> = {
  halal_only: { label: 'Fully halal', tone: 'sage' },
  halal: { label: 'Halal', tone: 'sage' },
  halal_options: { label: 'Halal options', tone: 'amber' },
  mosque: { label: 'Mosque', tone: 'walnut' },
  may_sell: { label: 'May stock halal · ask', tone: 'walnut' },
};

const DISTANCES = [2, 5, 10, 20, 30];

const PIN: Record<Place['halalStatus'], string> = {
  halal_only: '#2E7D4F',
  halal: '#2E7D4F',
  halal_options: '#C98A1B',
  mosque: '#6B4F3A',
  may_sell: '#8A8F98',
};

/** Places families added on the website, inside the search square. */
async function communityPlaces(lat: number, lng: number, km: number): Promise<Place[]> {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const { data } = await supabase
    .from('halal_places')
    .select('id, name, category, latitude, longitude, address, phone, halal_status, certification')
    .gte('latitude', lat - dLat)
    .lte('latitude', lat + dLat)
    .gte('longitude', lng - dLng)
    .lte('longitude', lng + dLng)
    .limit(200);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    key: `db:${r.id}`,
    name: String(r.name),
    category: (r.category as Category) ?? 'other',
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    address: (r.address as string) ?? null,
    phone: (r.phone as string) ?? null,
    openingHours: null,
    halalStatus: r.halal_status === 'halal_options' ? 'halal_options' : 'halal',
    cuisine: null,
    community: true,
  }));
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function openDirections(p: Place) {
  const label = encodeURIComponent(p.name);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${p.latitude},${p.longitude}&q=${label}`
      : `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
  Linking.openURL(url);
}

export default function Halal() {
  const { settings, update } = usePrayerSettings();
  const place = settings?.place ?? null;
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [locating, setLocating] = useState(false);
  const [km, setKm] = useState(10);
  const [stores, setStores] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!place) return;
    setPlaces(null);
    setError(null);
    setNotice(null);
    const [osm, community] = await Promise.allSettled([
      callFunction<{ places: Place[]; stale?: boolean }>('halal-places', {
        lat: place.latitude,
        lng: place.longitude,
        radius: km * 1000,
        ...(stores ? { stores: 1 } : {}),
      }),
      communityPlaces(place.latitude, place.longitude, km),
    ]);
    const mine = community.status === 'fulfilled' ? community.value : [];
    if (osm.status === 'fulfilled') {
      setPlaces([...mine, ...(osm.value.places ?? [])]);
      if (osm.value.stale) setNotice('The map service is busy, so these results may be a little old.');
    } else if (mine.length) {
      setPlaces(mine);
      setNotice('The map service is busy right now. Showing places added by Firdam families — try again in a minute for more.');
    } else {
      setError('The map service is busy right now. Please try again in a minute.');
    }
  }, [place, km, stores]);

  useEffect(() => {
    load();
  }, [load]);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const p = await placeFromDevice();
      if (p !== 'denied') await update({ place: p });
      else setError('Location is off. Turn it on in Settings, or set your city in Prayer.');
    } finally {
      setLocating(false);
    }
  };

  const shown = useMemo(() => {
    if (!places || !place) return [];
    return places
      .filter((p) => filter === 'all' || p.category === filter)
      .map((p) => ({ p, km: distanceKm(place, p) }))
      .filter((x) => x.km <= km)
      // Places marked halal first, then shops that may stock it; nearest first.
      .sort((a, b) => Number(a.p.halalStatus === 'may_sell') - Number(b.p.halalStatus === 'may_sell') || a.km - b.km)
      .slice(0, 100);
  }, [places, place, filter, km]);

  return (
    <TabScreen title="Halal near me" subtitle={place ? `Around ${place.label}` : 'Restaurants, butchers, groceries and mosques'}>
      {!place ? (
        <Card style={{ gap: 12 }}>
          <T size={15}>Share your location to see halal places nearby. It stays on your phone; only the area is used for the search.</T>
          <Button label="Use my location" onPress={useMyLocation} busy={locating} />
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FILTERS.map((f) => (
              <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <T size={13} weight="semibold" color={colors.muted}>
              Within
            </T>
            {DISTANCES.map((d) => (
              <Chip key={d} label={`${d} km`} selected={km === d} onPress={() => setKm(d)} />
            ))}
          </View>
          <Chip label="Also show shops that may stock halal food" selected={stores} onPress={() => setStores(!stores)} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="List" selected={view === 'list'} onPress={() => setView('list')} />
            <Chip label="Map" selected={view === 'map'} onPress={() => setView('map')} />
          </View>
          {notice ? (
            <T size={13} color={colors.muted}>
              {notice}
            </T>
          ) : null}

          {error ? (
            <Card style={{ gap: 10 }}>
              <T color={colors.brickText}>{error}</T>
              <Button label="Try again" variant="secondary" onPress={load} />
            </Card>
          ) : !places ? (
            <ActivityIndicator color={colors.walnut} style={{ marginTop: 24 }} />
          ) : shown.length === 0 ? (
            <Card>
              <T size={14.5} color={colors.muted}>
                {`Nothing listed within ${km} km yet. Try a wider distance or another filter.`}
              </T>
            </Card>
          ) : view === 'map' ? (
            <PlacesMap
              center={place}
              radiusKm={km}
              pins={shown.map(({ p, km: d }): MapPin => ({
                key: p.key,
                name: p.name,
                latitude: p.latitude,
                longitude: p.longitude,
                color: PIN[p.halalStatus],
                subtitle: [`${d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}`, STATUS[p.halalStatus].label].join(' · '),
              }))}
              onSelect={(key) => {
                const hit = shown.find((x) => x.p.key === key);
                if (hit) openDirections(hit.p);
              }}
            />
          ) : (
            shown.map(({ p, km }) => (
              <Pressable key={p.key} accessibilityRole="button" onPress={() => openDirections(p)} style={styles.card}>
                <View style={{ flex: 1, gap: 4 }}>
                  <T size={16} weight="bold" numberOfLines={2}>
                    {p.name}
                  </T>
                  <T size={13} color={colors.muted} numberOfLines={1}>
                    {[`${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}`, p.cuisine, p.address].filter(Boolean).join(' · ')}
                  </T>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                    <Badge label={STATUS[p.halalStatus].label} tone={STATUS[p.halalStatus].tone} />
                    {p.community ? <Badge label="Added by families" tone="walnut" /> : null}
                  </View>
                </View>
                <T size={13} weight="bold" color={colors.walnut}>
                  Directions
                </T>
              </Pressable>
            ))
          )}

          <Button label="Update my location" variant="text" onPress={useMyLocation} busy={locating} />
          <T size={11.5} color={colors.muted} style={{ textAlign: 'center' }}>
            Places from © OpenStreetMap contributors and Firdam families. Always check halal certification with the place.
          </T>
        </>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 14 },
});
