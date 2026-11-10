import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_FAVOURITES, cleanFavourites, type HomeFeatureId } from '@/shared/home-features';

const KEY = 'firdam.homeFavourites';
const listeners = new Set<(ids: HomeFeatureId[]) => void>();

export async function loadFavourites(): Promise<HomeFeatureId[]> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!raw) return [...DEFAULT_FAVOURITES];
  try {
    return cleanFavourites(JSON.parse(raw));
  } catch {
    return [...DEFAULT_FAVOURITES];
  }
}

export async function saveFavourites(ids: HomeFeatureId[]): Promise<void> {
  const clean = cleanFavourites(ids);
  await AsyncStorage.setItem(KEY, JSON.stringify(clean)).catch(() => {});
  listeners.forEach((l) => l(clean));
}

/** The family's favourites on Home, kept in step across screens. */
export function useFavourites(): { favourites: HomeFeatureId[]; save: (ids: HomeFeatureId[]) => Promise<void> } {
  const [favourites, setFavourites] = useState<HomeFeatureId[]>(DEFAULT_FAVOURITES);
  useEffect(() => {
    let alive = true;
    loadFavourites().then((ids) => alive && setFavourites(ids));
    listeners.add(setFavourites);
    return () => {
      alive = false;
      listeners.delete(setFavourites);
    };
  }, []);
  const save = useCallback((ids: HomeFeatureId[]) => saveFavourites(ids), []);
  return { favourites, save };
}
