import { AR } from '@/lib/i18n/ar';
import { FR } from '@/lib/i18n/fr';

/**
 * The website's language, the same system as the app: English is written in
 * the code, tr() looks it up in the French / Arabic dictionary and falls back
 * to English. The choice lives in the `firdam_lang` cookie, so the server
 * renders pages already in the right language (no flash of English).
 */
export type Lang = 'en' | 'fr' | 'ar';
export const LANG_COOKIE = 'firdam_lang';
export const LANGUAGES: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'fr', label: 'Français', short: 'FR' },
  { id: 'ar', label: 'العربية', short: 'ع' },
];

const DICTS: Record<Lang, Record<string, string> | null> = { en: null, fr: { ...FR }, ar: { ...AR } };

export function asLang(v: string | null | undefined): Lang | null {
  return v === 'en' || v === 'fr' || v === 'ar' ? v : null;
}

/** First supported language in an Accept-Language header ("fr-CA,fr;q=0.9,en;q=0.8" → fr). */
export function langFromHeader(header: string | null | undefined): Lang {
  for (const part of (header ?? '').split(',')) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (code === 'fr' || code === 'ar' || code === 'en') return code;
  }
  return 'en';
}

/** On the server: this request's cookie (else the browser's languages). Uses Next's per-request store. */
function serverLang(): Lang {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requestAsyncStorage } = require('next/dist/client/components/request-async-storage.external');
    const store = requestAsyncStorage.getStore();
    if (!store) return 'en';
    return asLang(store.cookies.get(LANG_COOKIE)?.value) ?? langFromHeader(store.headers.get('accept-language'));
  } catch {
    return 'en';
  }
}

let clientLang: Lang | null = null;

/** The current language: the request's on the server, the page's <html lang> in the browser. */
export function getLang(): Lang {
  if (typeof window === 'undefined') return serverLang();
  if (!clientLang) clientLang = asLang(document.documentElement.lang) ?? 'en';
  return clientLang;
}

export function isRTL(lang: Lang = getLang()): boolean {
  return lang === 'ar';
}

type Value = string | number | null | undefined;

/** Translates English text. Placeholders: tr('{0} days left', [n]). Unknown text stays English. */
export function tr(en: string | null | undefined, vars?: Value[] | Record<string, Value>): string {
  if (en == null) return '';
  const dict = DICTS[getLang()];
  let out = (dict && dict[en]) || en;
  if (vars) {
    out = out.replace(/\{(\w+)\}/g, (m, k) => {
      const v = Array.isArray(vars) ? vars[Number(k)] : (vars as Record<string, Value>)[k];
      return v == null ? '' : String(v);
    });
  }
  return out;
}

/** Locale for dates and numbers. Arabic keeps Western digits. */
export function locale(lang: Lang = getLang()): string {
  return lang === 'fr' ? 'fr-CA' : lang === 'ar' ? 'ar-u-nu-latn' : 'en-CA';
}

/** Saves the choice for a year and reloads so every page (server and browser) uses it. */
export function setLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}

/** Translates a value shown on screen only if it's text (numbers and elements pass through). */
export function trn<T>(value: T): T {
  return (typeof value === 'string' ? tr(value) : value) as T;
}

/**
 * Adds translations loaded from the database (recipe and food names, steps…),
 * keyed by their English text like the rest of the dictionary.
 */
export function addTranslations(lang: Lang, entries: Record<string, string>) {
  const dict = DICTS[lang];
  if (!dict) return;
  for (const [en, t] of Object.entries(entries)) if (en && t && !(en in FR_AR_BASE[lang])) dict[en] = t;
}
const FR_AR_BASE: Record<Lang, Record<string, string>> = { en: {}, fr: FR, ar: AR };
