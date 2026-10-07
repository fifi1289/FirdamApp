'use client';

import { useCallback, useEffect, useState } from 'react';

/** A place the user picked (city search or device location). */
export interface SavedLocation {
  id: number;
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  label: string;
}

/** Shared by Prayer Times, Ramadan and Halal Places so the user sets it once. */
export const LOCATION_STORAGE_KEY = 'firdam.prayer.location';
const LOCATION_EVENT = 'firdam-location-changed';

export function readSavedLocation(): SavedLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLocation;
    if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      return parsed;
    }
  } catch {
    // ignore malformed entry
  }
  return null;
}

export function writeSavedLocation(location: SavedLocation) {
  try {
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
    window.dispatchEvent(new Event(LOCATION_EVENT));
  } catch {
    // storage unavailable (private mode) — keep it in memory only
  }
}

/** Reads the saved location and stays in sync when another module changes it. */
export function useSavedLocation() {
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocation(readSavedLocation());
    setReady(true);
    const sync = () => setLocation(readSavedLocation());
    window.addEventListener(LOCATION_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(LOCATION_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const save = useCallback((next: SavedLocation) => {
    setLocation(next);
    writeSavedLocation(next);
  }, []);

  return { location, ready, save };
}

export function getDevicePosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not available on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => reject(new Error('Location permission was denied.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Bearing from a point to the Kaaba, in degrees clockwise from true north. */
export function qiblaBearing(latitude: number, longitude: number): number {
  const kaaba = { lat: 21.422487, lng: 39.826206 };
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(latitude);
  const φ2 = toRad(kaaba.lat);
  const Δλ = toRad(kaaba.lng - longitude);
  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  const θ = (Math.atan2(y, x) * 180) / Math.PI;
  return (θ + 360) % 360;
}

export function directionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
