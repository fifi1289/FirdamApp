import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { FR } from '@/i18n/fr';

/**
 * The app's language. English is written in the code itself; t() looks the
 * English text up in the French dictionary (and falls back to English, so a
 * missing line never breaks a screen). Arabic will plug in the same way.
 */
export type Lang = 'en' | 'fr';
export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
];

const KEY = 'firdam.language.v1';
const DICTS: Record<Lang, Record<string, string> | null> = { en: null, fr: FR };
const listeners = new Set<() => void>();
let current: Lang = deviceLang();
let ready = false;

function deviceLang(): Lang {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** Loads the saved choice once (the phone's language until someone picks one). */
export async function loadLanguage(): Promise<void> {
  if (ready) return;
  const saved = await AsyncStorage.getItem(KEY).catch(() => null);
  if (saved === 'en' || saved === 'fr') current = saved;
  ready = true;
  emit();
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  AsyncStorage.setItem(KEY, lang).catch(() => {});
  emit();
}

/**
 * Translates English text. Placeholders: tr('{0} days left', [n]) or
 * t('Hello {name}', { name }). Unknown text comes back as it is (in English).
 */
type Value = string | number | null | undefined;

export function tr(en: string | null | undefined, vars?: Value[] | Record<string, Value>): string {
  if (en == null) return '';
  const dict = DICTS[current];
  let out = (dict && dict[en]) || en;
  if (vars) {
    out = out.replace(/\{(\w+)\}/g, (m, k) => {
      const v = Array.isArray(vars) ? vars[Number(k)] : vars[k];
      return v == null ? '' : String(v);
    });
  }
  return out;
}

/** Locale for dates and numbers ("fr-CA" / "en-CA"). */
export function locale(): string {
  return current === 'fr' ? 'fr-CA' : 'en-CA';
}

/** Re-renders when the language changes; the root uses it to redraw every screen. */
export function useLanguage() {
  useEffect(() => {
    loadLanguage().catch(() => {});
  }, []);
  const lang = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );
  return { lang, ready, setLang };
}
