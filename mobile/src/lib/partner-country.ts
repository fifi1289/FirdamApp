import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { loadPrayerSettings } from '@/lib/prayer';
import { ALL_COUNTRIES, countryFromLocale, normalizeCountry } from '@/shared/partners';

/**
 * Which country's partners a family sees, the same as on firdam.com.
 * Home = the country of their prayer-times city, else the phone's region;
 * viewing = their choice in the picker (remembered on this phone).
 */
const PICK_KEY = 'firdam.partners.country.v1';
type State = { home: string | null; viewing: string | null };
const listeners = new Set<() => void>();
let state: State = { home: null, viewing: null };
let started = false;

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function phoneCountry(): string | null {
  try {
    return countryFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return null;
  }
}

async function start() {
  if (started) return;
  started = true;
  const [picked, settings] = await Promise.all([AsyncStorage.getItem(PICK_KEY).catch(() => null), loadPrayerSettings().catch(() => null)]);
  const home = normalizeCountry(settings?.place?.country) ?? phoneCountry();
  const viewing = picked === ALL_COUNTRIES ? ALL_COUNTRIES : normalizeCountry(picked) ?? home;
  emit({ home, viewing });
}

export function usePartnerCountry() {
  useEffect(() => {
    start().catch(() => {});
  }, []);
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state
  );
  const setViewing = (code: string) => {
    emit({ ...state, viewing: code });
    AsyncStorage.setItem(PICK_KEY, code).catch(() => {});
  };
  return { home: s.home, viewing: s.viewing, setViewing };
}
