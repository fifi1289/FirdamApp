'use client';

import { X } from 'lucide-react';

import { COUNTRIES, SHIPS_OPTIONS, WORKS_OPTIONS, countryName, type ShipsMode, type WorksMode } from '@/features/groceries/partners';
import { tr, trn } from '@/lib/i18n';

export interface PartnerWhere {
  country: string;
  ships_mode: ShipsMode;
  ship_countries: string[];
  exclude_countries: string[];
  works: WorksMode | null;
}

export const EMPTY_WHERE: PartnerWhere = { country: 'CA', ships_mode: 'country', ship_countries: [], exclude_countries: [], works: null };

/** Keeps only what the chosen mode uses (no stray "except" list on a country-only shop). */
export function cleanWhere(w: PartnerWhere, department: string): PartnerWhere {
  const serves = department === 'services' || department === 'learning';
  return {
    country: w.country,
    ships_mode: w.ships_mode,
    ship_countries: w.ships_mode === 'countries' ? w.ship_countries.filter((c) => c !== w.country) : [],
    exclude_countries: w.ships_mode === 'worldwide' ? w.exclude_countries.filter((c) => c !== w.country) : [],
    works: serves ? w.works : null,
  };
}

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

function CountryList({ label, value, exclude, onChange }: { label: string; value: string[]; exclude: string; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
      {trn(label)}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm">
              {tr(countryName(c))}
              <button type="button" aria-label={tr('Remove {0}', [countryName(c)])} onClick={() => onChange(value.filter((x) => x !== c))}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        className={selectCls}
        value=""
        onChange={(e) => e.target.value && onChange([...value, e.target.value].slice(0, 60))}
        aria-label={trn(label)}
      >
        <option value="">{tr('Add a country…')}</option>
        {COUNTRIES.filter((c) => c.code !== exclude && !value.includes(c.code)).map((c) => (
          <option key={c.code} value={c.code}>
            {tr(c.name)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Where the business is, who it delivers to / serves, and (services, learning) online or in person. */
export function PartnerWhereFields({ value, department, onChange }: { value: PartnerWhere; department: string; onChange: (w: PartnerWhere) => void }) {
  const serves = department === 'services' || department === 'learning';
  const set = (patch: Partial<PartnerWhere>) => onChange({ ...value, ...patch });
  return (
    <>
      <label className="space-y-1.5 text-sm font-medium text-foreground">
        {tr('Country your business is in *')}
        <select className={selectCls} value={value.country} onChange={(e) => set({ country: e.target.value })}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {tr(c.name)}
            </option>
          ))}
        </select>
      </label>

      {serves ? (
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('How do you work? *')}
          <select className={selectCls} value={value.works ?? ''} onChange={(e) => set({ works: (e.target.value || null) as WorksMode | null })}>
            <option value="">{tr('Choose…')}</option>
            {WORKS_OPTIONS.map((w) => (
              <option key={w.id} value={w.id}>
                {tr(w.label)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="hidden sm:block" />
      )}

      <fieldset className="space-y-2 text-sm font-medium text-foreground sm:col-span-2">
        <legend className="mb-1.5">{serves ? tr('Where are your clients? *') : tr('Where do you deliver? *')}</legend>
        {SHIPS_OPTIONS.map((o) => (
          <label key={o.id} className="flex items-center gap-2 font-normal">
            <input type="radio" name="ships_mode" checked={value.ships_mode === o.id} onChange={() => set({ ships_mode: o.id })} />
            {serves ? trn(o.serviceLabel) : tr(o.label)}
          </label>
        ))}
        {serves && value.works !== 'online' && (
          <p className="text-xs font-normal text-muted-foreground">{tr('For in-person work, also add your city above so families nearby find you.')}</p>
        )}
      </fieldset>

      {value.ships_mode === 'countries' && (
        <CountryList
          label={tr('Other countries you {0} (besides {1}) *', [serves ? tr('serve') : tr('deliver to'), tr(countryName(value.country))])}
          value={value.ship_countries}
          exclude={value.country}
          onChange={(v) => set({ ship_countries: v })}
        />
      )}
      {value.ships_mode === 'worldwide' && (
        <CountryList label={tr('Countries you don’t reach (optional)')} value={value.exclude_countries} exclude={value.country} onChange={(v) => set({ exclude_countries: v })} />
      )}
    </>
  );
}

/** A problem to show before saving, or null. */
export function whereProblem(w: PartnerWhere, department: string): string | null {
  const serves = department === 'services' || department === 'learning';
  if (serves && !w.works) return 'Choose whether you work online, in person or both.';
  if (w.ships_mode === 'countries' && !w.ship_countries.filter((c) => c !== w.country).length)
    return `Add the other countries you ${serves ? 'serve' : 'deliver to'}, or choose “Only in my country”.`;
  return null;
}
