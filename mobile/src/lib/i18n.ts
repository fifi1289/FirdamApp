import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useEffect, useSyncExternalStore } from 'react';
import { DevSettings, I18nManager } from 'react-native';

import { AR } from '@/i18n/ar';
import { FR } from '@/i18n/fr';

/**
 * The app's language. English is written in the code itself; t() looks the
 * English text up in the French dictionary (and falls back to English, so a
 * missing line never breaks a screen). Arabic will plug in the same way.
 */
export type Lang = 'en' | 'fr' | 'ar';
export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'ar', label: 'العربية' },
];

const KEY = 'firdam.language.v1';
const DICTS: Record<Lang, Record<string, string> | null> = { en: null, fr: FR, ar: AR };
const listeners = new Set<() => void>();
let current: Lang = deviceLang();
let ready = false;

function deviceLang(): Lang {
  try {
    const l = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    return l.startsWith('fr') ? 'fr' : l.startsWith('ar') ? 'ar' : 'en';
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
  if (saved === 'en' || saved === 'fr' || saved === 'ar') current = saved;
  ready = true;
  emit();
  // Arabic reads right to left: the layout flips after one restart.
  if (needsFlip(current)) await flipLayout(current);
}

function needsFlip(lang: Lang): boolean {
  return (lang === 'ar') !== I18nManager.isRTL;
}

async function flipLayout(lang: Lang) {
  I18nManager.allowRTL(lang === 'ar');
  I18nManager.forceRTL(lang === 'ar');
  try {
    await Updates.reloadAsync();
  } catch {
    try {
      DevSettings.reload();
    } catch {
      // Takes effect the next time the app opens.
    }
  }
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  emit();
  AsyncStorage.setItem(KEY, lang)
    .catch(() => {})
    .then(() => (needsFlip(lang) ? flipLayout(lang) : undefined));
}

/** Right-to-left (Arabic). */
export function isRTL(): boolean {
  return current === 'ar';
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
  // Arabic with Western digits, as most families in Canada and the Maghreb read them.
  return current === 'fr' ? 'fr-CA' : current === 'ar' ? 'ar-u-nu-latn' : 'en-CA';
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
