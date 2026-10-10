import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Badge, Chip } from '@/components/kitchen-ui';
import { TabScreen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { callFunction } from '@/lib/functions';
import { placeFromDevice } from '@/lib/location';
import { usePrayerSettings } from '@/lib/prayer';
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
  halalStatus: 'halal' | 'halal_only' | 'halal_options' | 'mosque';
  cuisine: string | null;
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
};

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

  const load = useCallback(async () => {
    if (!place) return;
    setPlaces(null);
    setError(null);
    try {
      const res = await callFunction<{ places: Place[] }>('halal-places', { lat: place.latitude, lng: place.longitude, radius: 8000 });
      setPlaces(res.places ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load places near you.');
    }
  }, [place]);

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
      .sort((a, b) => a.km - b.km)
      .slice(0, 60);
  }, [places, place, filter]);

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
                Nothing listed here yet within 8 km. Try another filter, or update your location.
              </T>
            </Card>
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
            Places from © OpenStreetMap contributors. Always check halal certification with the place.
          </T>
        </>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 14 },
});
