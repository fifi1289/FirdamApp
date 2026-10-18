import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadHijriMonth } from './calendar';
import { sunnahFastingDays, type FastingDay, type HijriLabel } from '@/shared/calendar-core';

/** Fasting choices kept on this phone. */
export interface FastingPrefs {
  /** Also list every Monday and Thursday. */
  mondaysThursdays: boolean;
  /** A reminder the evening before each fast, for suhoor. */
  remind: boolean;
}

const KEY = 'firdam.fasting';
const DEFAULTS: FastingPrefs = { mondaysThursdays: false, remind: false };

export async function getFastingPrefs(): Promise<FastingPrefs> {
  try {
    return { ...DEFAULTS, ...(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Partial<FastingPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

export async function setFastingPrefs(p: FastingPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
}

/** Recommended fasts from today for the given number of days. */
export async function upcomingFasts(prefs: Pick<FastingPrefs, 'mondaysThursdays'>, days = 60): Promise<FastingDay[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const hijri = new Map<string, HijriLabel>();
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const month = await loadHijriMonth(cursor.getFullYear(), cursor.getMonth() + 1);
    month.forEach((v, k) => hijri.set(k, v));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return sunnahFastingDays(hijri, start, end, { sunnahFasts: true, mondaysThursdays: prefs.mondaysThursdays });
}
