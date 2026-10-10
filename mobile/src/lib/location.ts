import * as Location from 'expo-location';

import type { PrayerPlace } from './prayer';

function placeName(address: Location.LocationGeocodedAddress | undefined): string | null {
  if (!address) return null;
  return address.city ?? address.subregion ?? address.region ?? null;
}

/** Asks for location (only while the app is open) and returns the phone's place. */
export async function placeFromDevice(): Promise<PrayerPlace | 'denied'> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return 'denied';
  const pos =
    (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  const { latitude, longitude } = pos.coords;
  let label = 'Your location';
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    label = placeName(address) ?? label;
  } catch {
    // The name is only for display; the times don't need it.
  }
  return { latitude, longitude, label };
}

/** Finds a typed city, e.g. "Mississauga" or "London, UK". */
export async function placeFromSearch(query: string): Promise<PrayerPlace | null> {
  const text = query.trim();
  if (!text) return null;
  const [hit] = await Location.geocodeAsync(text);
  if (!hit) return null;
  let label = text;
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude: hit.latitude, longitude: hit.longitude });
    label = placeName(address) ?? text;
  } catch {
    // Keep what was typed.
  }
  return { latitude: hit.latitude, longitude: hit.longitude, label };
}
