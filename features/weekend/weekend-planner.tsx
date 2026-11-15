'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, Check, Clock, ExternalLink, MapPin, Navigation, Sparkles, Sun } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { LocationPicker } from '@/components/location/location-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase/functions';
import { useSavedLocation } from '@/lib/geo/location';
import { getLang, locale, tr, trn } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  directionsLink,
  feeLabel,
  halalLabel,
  kindLabel,
  skyLabel,
  whoFromFamily,
  type Budget,
  type Style,
  type WeekendDay,
  type WeekendDayKey,
  type WeekendPlan,
  type Who,
} from './weekend-core';

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', value === o.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const dayName = (d: WeekendDay) =>
  new Date(`${d.date}T12:00:00`).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });

export function WeekendPlanner() {
  const supabase = createSupabaseBrowserClient();
  const { location, save } = useSavedLocation();
  const [who, setWho] = useState<Who>('single');
  const [kids, setKids] = useState<number[]>([]);
  const [style, setStyle] = useState<Style>('simple');
  const [budget, setBudget] = useState<Budget>('low');
  const [days, setDays] = useState<'sat' | 'sun' | 'both'>('sat');
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<WeekendPlan | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [past, setPast] = useState<{ id: string; created_at: string; plan: WeekendPlan }[]>([]);

  useEffect(() => {
    supabase
      .from('family_members')
      .select('birth_date, relationship')
      .then(({ data }) => {
        const guess = whoFromFamily(data ?? []);
        setWho(guess.who);
        setKids(guess.kids);
      });
    supabase
      .from('weekend_plans')
      .select('id, created_at, plan')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setPast((data ?? []) as { id: string; created_at: string; plan: WeekendPlan }[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const make = async () => {
    if (!location) return toast.error(tr('Choose where you live first.'));
    setBusy(true);
    try {
      const res = await callEdgeFunction<{ id: string | null; plan: WeekendPlan }>('weekend-plan', undefined, {
        body: {
          lat: location.latitude,
          lng: location.longitude,
          place: location.name,
          who,
          kids: who === 'family' ? kids : [],
          style,
          budget,
          days: (days === 'both' ? ['sat', 'sun'] : [days]) as WeekendDayKey[],
          lang: getLang(),
        },
      });
      setPlan(res.plan);
      setDone(new Set());
      if (res.id) setPast((p) => [{ id: res.id!, created_at: new Date().toISOString(), plan: res.plan }, ...p].slice(0, 5));
    } catch (e) {
      toast.error(e instanceof EdgeFunctionError ? tr(e.message) : tr('Could not make a program. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const addToCalendar = async (p: WeekendPlan) => {
    const rows = p.days.map((d) => {
      const first = d.steps.find((s) => s.time)?.time ?? null;
      return {
        title: d.theme || p.title || tr('Weekend outing'),
        kind: 'other',
        starts_on: d.date,
        start_time: first,
        location: d.steps.find((s) => s.place)?.place?.name ?? null,
        notes: [
          ...d.steps.map((s) => `${s.time ? `${s.time} ` : ''}${s.title}${s.place ? ` — ${s.place.name}` : ''}`),
          '',
          tr('Before you go:'),
          ...p.prepare.map((x) => `• ${x}`),
        ].join('\n'),
        // A reminder the day before, to prepare.
        reminders: ['1d'],
      };
    });
    const { error } = await supabase.from('family_events').insert(rows);
    if (error) return toast.error(tr('Could not add to your calendar'));
    toast.success(tr('Added to your family calendar, with a reminder the day before'));
  };

  return (
    <AppShell>
      <PageHeader
        title={tr('Weekend')}
        description={tr('A weekend program near home, made from real places: what to do, where to eat halal, where to pray, and what to prepare.')}
      />

      <Card className="mb-6">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">{tr('Where do you live?')}</p>
            <LocationPicker value={location} onChange={save} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">{tr('Who is going?')}</p>
              <Choice<Who>
                value={who}
                onChange={setWho}
                options={[
                  { id: 'single', label: tr('Just me') },
                  { id: 'couple', label: tr('A couple') },
                  { id: 'family', label: tr('Family with kids') },
                ]}
              />
              {who === 'family' && kids.length > 0 && (
                <p className="text-xs text-muted-foreground">{tr('Kids aged {0} (from your family)', [kids.join(tr(', '))])}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">{tr('What kind of day?')}</p>
              <Choice<Style>
                value={style}
                onChange={setStyle}
                options={[
                  { id: 'simple', label: tr('Simple') },
                  { id: 'fancy', label: tr('Special') },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">{tr('Budget')}</p>
              <Choice<Budget>
                value={budget}
                onChange={setBudget}
                options={[
                  { id: 'low', label: tr('Low budget') },
                  { id: 'normal', label: tr('Normal') },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">{tr('When?')}</p>
              <Choice
                value={days}
                onChange={setDays}
                options={[
                  { id: 'sat', label: tr('Saturday') },
                  { id: 'sun', label: tr('Sunday') },
                  { id: 'both', label: tr('Both days') },
                ]}
              />
            </div>
          </div>
          <Button onClick={make} disabled={busy || !location} className="w-full sm:w-auto">
            <Sparkles className="me-2 h-4 w-4" />
            {busy ? tr('Making your program…') : tr('Make our weekend program')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {tr('Every place comes from the map near you. Check opening hours and prices before you go.')}
          </p>
        </CardContent>
      </Card>

      {plan && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{plan.title}</h2>
            <Button variant="outline" size="sm" onClick={() => addToCalendar(plan)}>
              <CalendarPlus className="me-2 h-4 w-4" />
              {tr('Add to calendar')}
            </Button>
          </div>

          {plan.days.map((d) => (
            <Card key={d.day}>
              <CardContent className="p-5">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{dayName(d)}</p>
                    <p className="text-lg font-semibold">{d.theme}</p>
                  </div>
                  {d.weather && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Sun className="h-4 w-4" />
                      {tr('{0}, {1}–{2}°C, {3}% chance of rain', [tr(skyLabel(d.weather.code)), d.weather.min, d.weather.max, d.weather.rain])}
                    </p>
                  )}
                </div>
                <ol className="space-y-4 border-s border-border ps-4">
                  {d.steps.map((s, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-sm font-semibold">
                        {s.time && <span className="me-2 text-primary">{s.time}</span>}
                        {s.title}
                      </p>
                      {s.note && <p className="mt-0.5 text-sm text-muted-foreground">{s.note}</p>}
                      {s.place && (
                        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                          <p className="font-medium">{s.place.name}</p>
                          <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{tr(kindLabel(s.place.kind))}</span>
                            <span>{tr('{0} km from home', [trn(s.place.km)])}</span>
                            {feeLabel(s.place.fee) && <span>{tr(feeLabel(s.place.fee)!)}</span>}
                            {halalLabel(s.place.halal) && (
                              <span className={s.place.halal === 'likely' ? 'text-amber-700' : 'text-brand-mid'}>{tr(halalLabel(s.place.halal)!)}</span>
                            )}
                          </p>
                          {s.place.hours && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                              <Clock className="mt-0.5 h-3 w-3 shrink-0" />
                              <span dir="ltr">{s.place.hours}</span>
                            </p>
                          )}
                          {s.place.address && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                              {s.place.address}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                            <a href={directionsLink(s.place)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Navigation className="h-3 w-3" />
                              {tr('Directions')}
                            </a>
                            {s.place.website && (
                              <a href={s.place.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                <ExternalLink className="h-3 w-3" />
                                {tr('Website')}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}

          {plan.prepare.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="mb-3 font-semibold">{tr('Before you go')}</p>
                <ul className="space-y-2">
                  {plan.prepare.map((x, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setDone((s) => (s.has(i) ? new Set([...s].filter((n) => n !== i)) : new Set([...s, i])))}
                        className="flex items-start gap-2 text-start text-sm"
                      >
                        <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border', done.has(i) ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                          {done.has(i) && <Check className="h-3 w-3" />}
                        </span>
                        <span className={done.has(i) ? 'text-muted-foreground line-through' : ''}>{x}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {plan.money && <p className="mt-4 text-sm text-muted-foreground">{plan.money}</p>}
              </CardContent>
            </Card>
          )}
          <p className="text-xs text-muted-foreground">{plan.attribution}</p>
        </div>
      )}

      {!plan && past.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{tr('Your recent programs')}</p>
          {past.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.plan)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-start text-sm hover:bg-muted/40"
            >
              <span className="font-medium">{p.plan.title || tr('Weekend outing')}</span>
              <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString(locale())}</span>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
