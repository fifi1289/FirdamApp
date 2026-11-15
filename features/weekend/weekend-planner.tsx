'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Bus, CalendarPlus, Car, Check, ExternalLink, Home, MapPin, Mountain, Navigation, Tent, Trees, Users } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { LocationPicker } from '@/components/location/location-picker';
import { PlacesMap, type MapMarker } from '@/components/map/places-map';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { callEdgeFunction } from '@/lib/supabase/functions';
import { useSavedLocation } from '@/lib/geo/location';
import { fetchPrayerDay, usePrayerSettings } from '@/lib/prayer/prayer';
import { getLang, locale, tr, trn } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  CATEGORIES,
  MAP_FILTERS,
  PICNIC_KINDS,
  buildCamping,
  buildHome,
  buildOuting,
  buildTrip,
  buildVisit,
  categoryNote,
  comingWeekend,
  directionsLink,
  halalLabel,
  inSeason,
  kindLabel,
  loadNearby,
  loadRecipeIdeas,
  loadWeather,
  money,
  say,
  seasonOf,
  skyLabel,
  whoFromFamily,
  type Base,
  type Budget,
  type Category,
  type DayPrayers,
  type Nearby,
  type Program,
  type RecipeIdea,
  type RecipeNeed,
  type Spot,
  type Style,
  type Txt,
  type VisitTime,
  type Who,
} from './weekend-core';
import { CAMPS, CITIES, cityNear, kmBetween } from './weekend-library';

let CUR: string | null = null;
const t = (x: Txt) => say(x, tr, (n) => money(n, CUR, locale()));
const ICONS: Record<Category, typeof Home> = { home: Home, visit: Users, out: MapPin, picnic: Trees, travel: Mountain, camping: Tent };
const CAR_KEY = 'firdam.weekend.car';

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', value === o.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-sm font-semibold">{label}</p>
    {children}
  </div>
);

async function prayersFor(lat: number, lng: number, settings: Parameters<typeof fetchPrayerDay>[2], date: string): Promise<DayPrayers> {
  const d = await fetchPrayerDay(lat, lng, settings, new Date(`${date}T12:00:00`));
  const s = (x: string) => x.slice(0, 5);
  return { fajr: s(d.timings.Fajr), dhuhr: s(d.timings.Dhuhr), asr: s(d.timings.Asr), maghrib: s(d.timings.Maghrib), isha: s(d.timings.Isha) };
}

export function WeekendPlanner() {
  const supabase = createSupabaseBrowserClient();
  const { location, save } = useSavedLocation();
  const { settings } = usePrayerSettings();
  const [category, setCategory] = useState<Category | null>(null);
  const [who, setWho] = useState<Who>('single');
  const [kids, setKids] = useState<number[]>([]);
  const [car, setCar] = useState(false);
  const [style, setStyle] = useState<Style>('simple');
  const [budget, setBudget] = useState<Budget>('low');
  const [day, setDay] = useState<'sat' | 'sun' | 'both'>('sat');
  const [when, setWhen] = useState<VisitTime>('afternoon');
  const [away, setAway] = useState(30);
  const [dest, setDest] = useState<string>('');
  const [camp, setCamp] = useState<string>('');
  const [near, setNear] = useState<Nearby | null>(null);
  const [filter, setFilter] = useState(MAP_FILTERS[0].id);
  const [picked, setPicked] = useState<Spot | null>(null);
  const [busy, setBusy] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [ideas, setIdeas] = useState<Partial<Record<RecipeNeed, RecipeIdea[]>>>({});
  const [done, setDone] = useState<Set<number>>(new Set());
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const weekend = useMemo(() => comingWeekend(), []);
  const dates = day === 'both' ? [weekend.sat, weekend.sun] : [day === 'sat' ? weekend.sat : weekend.sun];
  const home = location ? { lat: location.latitude, lng: location.longitude } : null;
  const season = home ? seasonOf(dates[0], home.lat) : null;

  useEffect(() => {
    try { setCar(window.localStorage.getItem(CAR_KEY) === 'yes'); } catch { /* private mode */ }
    supabase.from('family_members').select('birth_date, relationship').then(({ data }) => {
      const guess = whoFromFamily(data ?? []);
      setWho(guess.who);
      setKids(guess.kids);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saveCar = (v: boolean) => { setCar(v); try { window.localStorage.setItem(CAR_KEY, v ? 'yes' : 'no'); } catch { /* ignore */ } };

  // The map: places near home for "Go out" and "Picnic".
  useEffect(() => {
    if (!home || (category !== 'out' && category !== 'picnic' && category !== 'camping')) return;
    setLoadingPlaces(true);
    callEdgeFunction<{ ready: boolean }>('weekend-places', undefined, { body: { lat: home.lat, lng: home.lng } }).catch(() => null);
    loadNearby(supabase, home).then(setNear).finally(() => setLoadingPlaces(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, home?.lat, home?.lng]);

  const shown = useMemo(() => {
    if (!near || !home || !season) return [] as Spot[];
    const kinds = category === 'picnic' ? PICNIC_KINDS : MAP_FILTERS.find((f) => f.id === filter)?.kinds ?? [];
    return near.places
      .filter((p) => kinds.includes(p.kind) && inSeason(p.kind, season))
      .sort((a, b) => kmBetween(home, a) - kmBetween(home, b))
      .slice(0, 80);
  }, [near, home, season, category, filter]);

  const destinations = useMemo(() => {
    if (!home) return [];
    const mine = cityNear(home);
    return CITIES.filter((c) => c.id !== mine?.id && kmBetween(home, c) > 30).sort((a, b) => kmBetween(home, a) - kmBetween(home, b));
  }, [home]);
  const camps = useMemo(() => (home ? CAMPS.filter((c) => kmBetween(home, c) < 200) : []), [home]);

  const make = async (place?: Spot) => {
    if (!home || !category) return toast.error(tr('Choose where you live first.'));
    setBusy(true);
    try {
      const lang = getLang() as Base['lang'];
      const city = category === 'travel' ? CITIES.find((c) => c.id === dest) : null;
      if (category === 'travel' && !city) return toast.error(tr('Choose a city'));
      const at = city ? { lat: city.lat, lng: city.lng } : home;
      const multi = category === 'travel' || category === 'camping';
      const ds = multi && day === 'both' ? [weekend.sat, weekend.sun] : dates.slice(0, 1);
      const [prayers, weather, nearby] = await Promise.all([
        Promise.all(ds.map((d) => prayersFor(at.lat, at.lng, settings, d))),
        loadWeather(at, ds),
        near && !city ? Promise.resolve(near) : loadNearby(supabase, at),
      ]);
      const base: Base = { who, kids: who === 'family' ? kids : [], style, budget, car, home, dates: ds, prayers, weather, lang };
      const campPick = CAMPS.find((c) => c.id === camp);
      const p =
        category === 'home' ? buildHome(base)
        : category === 'visit' ? buildVisit(base, when, away)
        : category === 'travel' ? buildTrip(base, city!, nearby)
        : category === 'camping' ? (campPick ? buildCamping(base, campPick, nearby) : null)
        : place ? buildOuting(base, place, nearby, category === 'picnic') : null;
      if (!p) return toast.error(tr('Pick a place first'));
      p.days.forEach((d, i) => { d.weather = weather[i] ?? null; });
      setProgram(p);
      setDone(new Set());
      const needs = Array.from(new Set(p.days.flatMap((d) => d.lines.map((l) => l.recipes)).filter((x): x is RecipeNeed => !!x)));
      const loaded = await Promise.all(needs.map(async (n) => [n, await loadRecipeIdeas(supabase, n, 4)] as const));
      setIdeas(Object.fromEntries(loaded));
      supabase.from('weekend_plans').insert({ options: { category, who, style, budget, car }, plan: p }).then(() => undefined);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error(tr('Could not make a program. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const addToCalendar = async (p: Program) => {
    const rows = p.days.map((d) => ({
      title: t(p.title),
      kind: 'other' as const,
      starts_on: d.date,
      start_time: d.lines.find((l) => !l.prayer)?.time ?? null,
      location: d.lines.find((l) => l.place && !l.prayer)?.place?.name ?? null,
      notes: [...d.lines.map((l) => `${l.time ?? ''} ${t(l.title)}${l.place ? ` — ${l.place.name}` : ''}`), '', tr('Before you go:'), ...p.prepare.map((x) => `• ${t(x)}`)].join('\n'),
      reminders: ['1d'],
    }));
    const { error } = await supabase.from('family_events').insert(rows);
    if (error) return toast.error(tr('Could not add to your calendar'));
    toast.success(tr('Added to your family calendar, with a reminder the day before'));
  };

  const reset = () => { setProgram(null); setPicked(null); };

  // ── The program ─────────────────────────────────────────────────
  if (program) {
    const cur = program.currency;
    CUR = cur;
    return (
      <AppShell>
        <button type="button" onClick={reset} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {tr('Back')}
        </button>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t(program.title)}</h1>
          <Button variant="outline" size="sm" onClick={() => addToCalendar(program)}>
            <CalendarPlus className="me-2 h-4 w-4" /> {tr('Add to calendar')}
          </Button>
        </div>
        {program.warnings.length > 0 && (
          <div className="mb-5 space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {program.warnings.map((w, i) => (
              <p key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t(w)}</p>
            ))}
          </div>
        )}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {program.days.map((d, di) => {
              return (
                <Card key={d.date}>
                  <CardContent className="p-5">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary">
                      {new Date(`${d.date}T12:00:00`).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}
                      {program.ramadan && di === 0 ? ` · ${tr('Ramadan')}` : ''}
                    </p>
                    {d.weather && (
                      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                        {tr('{0}, {1}–{2}°C, {3}% chance of rain', [tr(skyLabel(d.weather.code)), d.weather.min, d.weather.max, d.weather.rain])}
                      </p>
                    )}
                    <ol className="space-y-4 border-s border-border ps-4">
                      {d.lines.map((l, i) => (
                        <li key={i} className="relative">
                          <span className={cn('absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full', l.prayer ? 'bg-brand-mid ring-2 ring-brand-mid/30' : 'bg-primary')} />
                          <p className={cn('text-sm font-semibold', l.prayer && 'text-brand-mid')}>
                            {l.time && <span className="me-2 tabular-nums" dir="ltr">{l.time}</span>}
                            {t(l.title)}
                          </p>
                          {l.notes.map((n, j) => <p key={j} className="mt-0.5 text-sm text-muted-foreground">{t(n)}</p>)}
                          {l.place && <PlaceCard place={l.place} car={car} />}
                          {l.recipes && (ideas[l.recipes]?.length ?? 0) > 0 && (
                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                              {ideas[l.recipes]!.map((r) => (
                                <Link key={r.id} href={`/dashboard/recipes/c-${r.id}`} className="w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-card text-xs hover:border-primary">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={r.image} alt="" className="h-20 w-full object-cover" />
                                  <p className="line-clamp-2 p-2 font-medium">{trn(r.name)}</p>
                                </Link>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="space-y-5">
            <Card>
              <CardContent className="p-5">
                <p className="mb-3 font-semibold">{tr('Budget')}</p>
                {program.costs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tr('Nothing to pay today.')}</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {program.costs.map((c, i) => (
                      <li key={i}>
                        <div className="flex justify-between gap-3">
                          <span>{t(c.label)}</span>
                          <span className={cn('shrink-0 font-semibold tabular-nums', c.amount == null && 'font-normal text-muted-foreground')}>
                            {c.amount == null ? tr('Check the price') : c.amount === 0 ? tr('Free') : money(c.amount, cur, locale())}
                          </span>
                        </div>
                        {c.detail && <p className="text-xs text-muted-foreground">{t(c.detail)}</p>}
                      </li>
                    ))}
                    <li className="flex justify-between border-t border-border pt-3 font-semibold">
                      <span>{program.partial ? tr('At least') : tr('Total')}</span>
                      <span className="tabular-nums">{money(program.total, cur, locale())}</span>
                    </li>
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="mb-3 font-semibold">{tr('Before you go')}</p>
                <ul className="space-y-2">
                  {program.prepare.map((x, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => setDone((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} className="flex items-start gap-2 text-start text-sm">
                        <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border', done.has(i) ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                          {done.has(i) && <Check className="h-3 w-3" />}
                        </span>
                        <span className={done.has(i) ? 'text-muted-foreground line-through' : ''}>{t(x)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            {program.tips.length > 0 && (
              <Card>
                <CardContent className="space-y-2 p-5 text-sm">
                  <p className="font-semibold">{tr('Good to know')}</p>
                  {program.tips.map((x, i) => <p key={i} className="text-muted-foreground">{t(x)}</p>)}
                </CardContent>
              </Card>
            )}
            {program.sources.length > 0 && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-semibold">{tr('Where the prices come from')}</p>
                {program.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block hover:underline">
                    {tr(s.name)} · {tr('checked {0}', [new Date(`${s.checked}T12:00:00`).toLocaleDateString(locale())])}
                  </a>
                ))}
                <p>{tr('Prices can change: check them before you go.')}</p>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Choosing ────────────────────────────────────────────────────
  const note = category && home ? categoryNote(category, dates[0], home.lat, null) : null;
  return (
    <AppShell>
      <PageHeader title={tr('Weekend program')} description={tr('What would you like to do this weekend? Every program keeps all the prayers on time.')} />
      <Card className="mb-5">
        <CardContent className="p-5">
          <Field label={tr('Where do you live?')}>
            <LocationPicker value={location} onChange={save} />
          </Field>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c.id];
          const why = home ? categoryNote(c.id, dates[0], home.lat, null) : null;
          return (
            <button key={c.id} type="button" onClick={() => { setCategory(c.id); setPicked(null); }}
              className={cn('flex items-start gap-3 rounded-2xl border p-4 text-start transition-colors', category === c.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40')}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <span>
                <span className="block font-semibold">{tr(c.label)}</span>
                <span className="block text-sm text-muted-foreground">{tr(c.hint)}</span>
                {why && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">{t(why)}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {category && (
        <Card className="mb-6">
          <CardContent className="space-y-4 p-5">
            {note && <p className="flex gap-2 text-sm text-amber-800 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t(note)}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Who is going?')}>
                <Choice<Who> value={who} onChange={setWho} options={[{ id: 'single', label: tr('Just me') }, { id: 'couple', label: tr('A couple') }, { id: 'family', label: tr('Family with kids') }]} />
                {who === 'family' && (
                  <Input className="mt-2 max-w-xs" placeholder={tr('Children’s ages, e.g. 4, 9')} value={kids.join(', ')}
                    onChange={(e) => setKids(e.target.value.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n < 18))} />
                )}
              </Field>
              <Field label={category === 'travel' || category === 'camping' ? tr('How long?') : tr('Which day?')}>
                <Choice value={day} onChange={setDay} options={
                  category === 'travel' || category === 'camping'
                    ? [{ id: 'sat', label: tr('One day') }, { id: 'both', label: tr('Two days (one night)') }]
                    : [{ id: 'sat', label: tr('Saturday') }, { id: 'sun', label: tr('Sunday') }]
                } />
              </Field>
              {category !== 'home' && (
                <Field label={tr('How will you get around?')}>
                  <Choice value={car ? 'car' : 'bus'} onChange={(v) => saveCar(v === 'car')} options={[{ id: 'bus', label: tr('Bus, train or walking') }, { id: 'car', label: tr('Car') }]} />
                </Field>
              )}
              {category !== 'home' && category !== 'visit' && (
                <>
                  <Field label={tr('What kind of day?')}>
                    <Choice<Style> value={style} onChange={setStyle} options={[{ id: 'simple', label: tr('Simple') }, { id: 'fancy', label: tr('Special') }]} />
                  </Field>
                  <Field label={tr('Budget')}>
                    <Choice<Budget> value={budget} onChange={setBudget} options={[{ id: 'low', label: tr('Low budget') }, { id: 'normal', label: tr('Normal') }]} />
                  </Field>
                </>
              )}
              {category === 'visit' && (
                <>
                  <Field label={tr('When is the visit?')}>
                    <Choice<VisitTime> value={when} onChange={setWhen} options={[{ id: 'lunch', label: tr('Lunch') }, { id: 'afternoon', label: tr('Afternoon') }, { id: 'evening', label: tr('Evening') }]} />
                  </Field>
                  <Field label={tr('How far do they live?')}>
                    <Choice value={String(away)} onChange={(v) => setAway(+v)} options={[{ id: '15', label: tr('{0} min', [15]) }, { id: '30', label: tr('{0} min', [30]) }, { id: '60', label: tr('{0} min', [60]) }, { id: '120', label: tr('2 hours') }]} />
                  </Field>
                </>
              )}
              {category === 'travel' && (
                <Field label={tr('Where to?')}>
                  <select value={dest} onChange={(e) => setDest(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
                    <option value="">{tr('Choose a city')}</option>
                    {destinations.map((c) => (
                      <option key={c.id} value={c.id}>{c.name[getLang() as 'en' | 'fr' | 'ar']} · {tr('{0} km', [Math.round(kmBetween(home!, c))])}</option>
                    ))}
                  </select>
                </Field>
              )}
              {category === 'camping' && (
                <Field label={tr('Which campground?')}>
                  {camps.length ? (
                    <select value={camp} onChange={(e) => setCamp(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
                      <option value="">{tr('Choose a campground')}</option>
                      {camps.map((c) => <option key={c.id} value={c.id}>{c.name[getLang() as 'en' | 'fr' | 'ar']}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">{tr('We have not checked campgrounds near you yet. We are adding cities one by one.')}</p>
                  )}
                </Field>
              )}
            </div>

            {(category === 'out' || category === 'picnic') ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">{category === 'picnic' ? tr('Pick a park') : tr('Pick a place')}</p>
                {category === 'out' && (
                  <div className="flex flex-wrap gap-1.5">
                    {MAP_FILTERS.map((f) => (
                      <button key={f.id} type="button" onClick={() => setFilter(f.id)}
                        className={cn('rounded-full border px-3 py-1 text-xs font-medium', filter === f.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>
                        {tr(f.label)}
                      </button>
                    ))}
                  </div>
                )}
                <PlacesMap
                  className="h-[340px] rounded-xl"
                  center={home ? { latitude: home.lat, longitude: home.lng } : null}
                  radiusKm={25}
                  selectedId={picked?.key ?? null}
                  onSelect={(id) => setPicked(shown.find((s) => s.key === id) ?? null)}
                  markers={shown.map((s): MapMarker => ({ id: s.key, latitude: s.lat, longitude: s.lng, variant: s.indoor ? 'cafe' : 'grocery', title: s.name }))}
                />
                {loadingPlaces && <p className="text-sm text-muted-foreground">{tr('Loading places…')}</p>}
                {!loadingPlaces && near && shown.length === 0 && <p className="text-sm text-muted-foreground">{tr('We are still gathering places near you. Try again in a few minutes.')}</p>}
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {shown.slice(0, 30).map((s) => (
                    <button key={s.key} type="button" onClick={() => setPicked(s)}
                      className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm', picked?.key === s.key ? 'bg-primary/10' : 'hover:bg-muted/50')}>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{tr(kindLabel(s.kind))} · {tr('{0} km', [trn(kmBetween(home!, s).toFixed(1))])}</span>
                    </button>
                  ))}
                </div>
                <Button disabled={!picked || busy} onClick={() => make(picked!)} className="w-full sm:w-auto">
                  {busy ? tr('Making your program…') : picked ? tr('Plan our day at {0}', [picked.name]) : tr('Pick a place first')}
                </Button>
              </div>
            ) : (
              <Button onClick={() => make()} disabled={busy || !home || (category === 'travel' && !dest) || (category === 'camping' && !camp)} className="w-full sm:w-auto">
                {busy ? tr('Making your program…') : tr('Make our program')}
              </Button>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {car ? <Car className="h-3.5 w-3.5" /> : <Bus className="h-3.5 w-3.5" />}
              {tr('Prayer times come from your prayer settings. Prices are only shown when we have checked them.')}
            </p>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

function PlaceCard({ place, car }: { place: Spot; car: boolean }) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <p className="font-medium">{place.name}</p>
      <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
        <span>{tr(kindLabel(place.kind))}</span>
        {halalLabel(place.halal) && <span className={place.halal === 'likely' ? 'text-amber-700' : 'text-brand-mid'}>{tr(halalLabel(place.halal)!)}</span>}
      </p>
      {place.address && <p className="mt-1 text-xs text-muted-foreground">{place.address}</p>}
      {place.hours && <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{place.hours}</p>}
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
        <a href={directionsLink(place, car)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          <Navigation className="h-3 w-3" /> {tr('Directions')}
        </a>
        {place.website && (
          <a href={place.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            <ExternalLink className="h-3 w-3" /> {tr('Website')}
          </a>
        )}
      </div>
    </div>
  );
}

