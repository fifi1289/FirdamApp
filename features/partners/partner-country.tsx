'use client';

import { useSyncExternalStore } from 'react';
import { Globe } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ALL_COUNTRIES, countryFromLocale, countryFromTimeZone, countryName, normalizeCountry, partnerCountryOptions, type PartnerShop } from '@/features/groceries/partners';
import { tr } from '@/lib/i18n';

/**
 * Which country's partners a family sees. Home = where they are (Cloudflare's
 * country, set as a cookie by the middleware, else the browser language);
 * viewing = their choice in the picker (remembered on this browser).
 */
const PICK_KEY = 'firdam_partner_country';
const listeners = new Set<() => void>();
let state: { home: string | null; viewing: string | null } | null = null;

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function load() {
  if (state) return state;
  let tz: string | undefined;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* old browser */
  }
  const home = normalizeCountry(readCookie('firdam_country')) ?? countryFromTimeZone(tz) ?? countryFromLocale(navigator.language);
  let picked: string | null = null;
  try {
    picked = localStorage.getItem(PICK_KEY);
  } catch {
    /* private window: just don't remember */
  }
  const viewing = picked === ALL_COUNTRIES ? ALL_COUNTRIES : normalizeCountry(picked) ?? home;
  state = { home, viewing };
  return state;
}

const SERVER = { home: null, viewing: null };

export function usePartnerCountry() {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
    () => SERVER
  );
  const setViewing = (code: string) => {
    state = { home: load().home, viewing: code };
    try {
      localStorage.setItem(PICK_KEY, code);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  };
  return { home: s.home, viewing: s.viewing, setViewing };
}

/** "Showing partners for: Canada ▾" — the family's country, the countries partners reach, or all. */
export function PartnerCountryPicker({ shops, className }: { shops: PartnerShop[]; className?: string }) {
  const { home, viewing, setViewing } = usePartnerCountry();
  const options = partnerCountryOptions(shops, home);
  if (viewing && viewing !== ALL_COUNTRIES && !options.includes(viewing)) options.push(viewing);
  return (
    <label className={cn('inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground', className)}>
      <Globe className="h-4 w-4 text-primary" aria-hidden />
      {tr('Showing partners for')}
      <select
        value={viewing ?? ALL_COUNTRIES}
        onChange={(e) => setViewing(e.target.value)}
        className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {tr(countryName(c))}
            {c === home ? tr(' (you)') : ''}
          </option>
        ))}
        <option value={ALL_COUNTRIES}>{tr('All countries')}</option>
      </select>
    </label>
  );
}
