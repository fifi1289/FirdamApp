import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Badge, Chip } from '@/components/kitchen-ui';
import { PlacesMap, type MapPin } from '@/components/places-map';
import { TabScreen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { callFunction } from '@/lib/functions';
import { placeFromDevice } from '@/lib/location';
import { usePrayerSettings } from '@/lib/prayer';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { showAlert } from '@/components/firdam-alert';

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
  halalStatus: 'halal' | 'halal_only' | 'halal_options' | 'mosque' | 'may_sell' | 'likely';
  cuisine: string | null;
  /** Added by Firdam families on the website. */
  community?: boolean;
  /** Added by this family and waiting for Firdam to approve it. */
  pending?: boolean;
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
  likely: { label: 'Likely halal · ask', tone: 'amber' },
};

/** Confirmed halal first, then likely halal, then shops that may stock it. */
const rank = (p: Place) => (p.halalStatus === 'may_sell' ? 2 : p.halalStatus === 'likely' ? 1 : 0);

/** One search area around you; the list is sorted nearest first. */
const RADIUS_KM = 25;

const PIN: Record<Place['halalStatus'], string> = {
  halal_only: '#2E7D4F',
  halal: '#2E7D4F',
  halal_options: '#C98A1B',
  mosque: '#6B4F3A',
  may_sell: '#8A8F98',
  likely: '#E0A84B',
};

/** Places families added on the website, inside the search square. */
async function communityPlaces(lat: number, lng: number, km: number): Promise<Place[]> {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const { data } = await supabase
    .from('halal_places')
    .select('id, name, category, latitude, longitude, address, phone, halal_status, certification, status')
    .neq('status', 'rejected')
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
    pending: r.status === 'pending',
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
  const km = RADIUS_KM;
  const [stores, setStores] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!place) return;
    setPlaces(null);
    setError(null);
    setNotice(null);
    const [osm, community] = await Promise.allSettled([
      callFunction<{ places: Place[]; pending?: boolean }>('halal-places', {
        lat: place.latitude,
        lng: place.longitude,
        radius: km * 1000,
        ...(stores ? { stores: 1 } : {}),
      }),
      communityPlaces(place.latitude, place.longitude, km),
    ]);
    const mine = community.status === 'fulfilled' ? community.value : [];
    const found = osm.status === 'fulfilled' ? osm.value.places ?? [] : [];
    setPlaces([...mine, ...found]);
    // A brand-new area is filled in by Firdam within a few minutes.
    if (osm.status === 'rejected' || osm.value.pending) {
      setNotice(found.length ? 'Adding more places around you — pull back in a few minutes for the full list.' : 'Firdam is gathering halal places for your area. Check back in a few minutes.');
    }
  }, [place, stores]);

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
      .sort((a, b) => rank(a.p) - rank(b.p) || a.km - b.km)
      .slice(0, 100);
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
                {filter === 'all' ? 'No halal places listed near you yet.' : 'Nothing in this category near you yet. Try “All”.'}
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
                    {p.pending ? <Badge label="Waiting for approval" tone="amber" /> : p.community ? <Badge label="Added by families" tone="walnut" /> : null}
                  </View>
                </View>
                <T size={13} weight="bold" color={colors.walnut}>
                  Directions
                </T>
              </Pressable>
            ))
          )}

          <Button label="Add a halal place you know" variant="secondary" onPress={() => setAdding(true)} />
          <AddPlaceSheet open={adding} near={place} onClose={() => setAdding(false)} onAdded={load} />
          <Button label="Update my location" variant="text" onPress={useMyLocation} busy={locating} />
          <T size={11.5} color={colors.muted} style={{ textAlign: 'center' }}>
            Places from © OpenStreetMap contributors and Firdam families. Always check halal certification with the place.
          </T>
        </>
      )}
    </TabScreen>
  );
}

const ADD_CATEGORIES: { key: Category; label: string }[] = [
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'butcher', label: 'Butcher' },
  { key: 'grocery', label: 'Grocery' },
  { key: 'cafe', label: 'Café / bakery' },
  { key: 'mosque', label: 'Mosque' },
];

/** Families add places the map doesn't know yet, by name and street address. */
type Spot = { latitude: number; longitude: number; label: string; city: string | null; country: string | null };

/** Finds an address with the phone's own geocoder (Apple / Google), then Firdam's server. */
async function findAddress(address: string): Promise<Spot | null> {
  try {
    const [hit] = await Location.geocodeAsync(address);
    if (hit) {
      const [r] = await Location.reverseGeocodeAsync(hit).catch(() => []);
      return { latitude: hit.latitude, longitude: hit.longitude, label: address, city: r?.city ?? null, country: r?.country ?? null };
    }
  } catch {
    // Fall through to the server.
  }
  try {
    const res = await callFunction<{ results: Spot[] }>('halal-places', { address });
    const hit = res.results?.[0];
    if (hit) return { ...hit, label: address };
  } catch {
    // Not found anywhere.
  }
  return null;
}

/** Families add places the map doesn't know yet, by name and address, typed however they like. */
function AddPlaceSheet({
  open,
  near,
  onClose,
  onAdded,
}: {
  open: boolean;
  near: { latitude: number; longitude: number; label?: string } | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<Category>('restaurant');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const save = async () => {
    if (name.trim().length < 2 || address.trim().length < 3) return setProblem('Add the name and the address.');
    setProblem(null);
    setSaving(true);
    try {
      // The address is kept exactly as typed. If no map service finds it, the place is pinned
      // near you for now and the admin fixes the pin when approving it.
      const hit = (await findAddress(address.trim())) ??
        (near ? { latitude: near.latitude, longitude: near.longitude, label: address.trim(), city: null, country: null } : null);
      if (!hit) {
        setProblem('Turn on location or choose your city first, then try again.');
        return;
      }
      const { error } = await supabase.from('halal_places').insert({
        name: name.trim(),
        category,
        address: address.trim(),
        city: hit.city,
        country: hit.country,
        latitude: hit.latitude,
        longitude: hit.longitude,
        halal_status: 'halal',
      });
      if (error) throw error;
      setName('');
      setAddress('');
      onClose();
      onAdded();
      setTimeout(() => showAlert('Thank you!', 'Firdam will check the place and add it for every family nearby, usually within a day. You can already see it, marked “Waiting for approval”.'), 400);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not add the place. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheetWrap} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled" bounces={false}>
          <T weight="extrabold" size={20}>
            Add a halal place
          </T>
          <TextInput value={name} onChangeText={setName} placeholder="Name, e.g. Shawarma Palace" placeholderTextColor="#9C8D84" style={styles.input} />
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Address, e.g. 464 Rideau St, Ottawa"
            placeholderTextColor="#9C8D84"
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ADD_CATEGORIES.map((c) => (
              <Chip key={c.key} label={c.label} selected={category === c.key} onPress={() => setCategory(c.key)} />
            ))}
          </View>
          {problem ? (
            <T size={13.5} color={colors.brickText}>
              {problem}
            </T>
          ) : null}
          <Button label="Add the place" onPress={save} busy={saving} />
          <Button label="Cancel" variant="text" onPress={onClose} />
          </ScrollView>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(40,28,20,0.35)', justifyContent: 'flex-end' },
  sheetWrap: { backgroundColor: colors.linen, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  sheet: { padding: 20, gap: 12, paddingBottom: 34 },
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 15, color: colors.espresso },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 14 },
});
