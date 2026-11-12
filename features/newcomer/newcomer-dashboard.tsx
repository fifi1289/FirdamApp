'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bus, Car, Check, ChevronRight, ExternalLink, Footprints, Loader2 } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ageFromBirthDate } from '@/features/lunchbox/lunchbox-core';
import {
  NEWCOMER_PHASES,
  currentPhase,
  daysInCountry,
  directionsUrl,
  helpFor,
  nextStep,
  pick,
  progress,
  stepsFor,
  stepView,
  transitFor,
  tripPlannerUrl,
  type NewcomerCountry,
  type NewcomerPhase,
  type NewcomerPlan,
  type NewcomerStatus,
  type NewcomerStep,
  type NewcomerStepRow,
} from '@/features/newcomer/newcomer-core';
import { NEWCOMER_COUNTRIES, newcomerCountry } from '@/features/newcomer/newcomer-countries';
import { getLang, locale, tr } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Tab = 'plan' | 'around' | 'free' | 'discount' | 'deal';
interface Person {
  id: string;
  name: string;
  me: boolean;
}

const PLAN_COLUMNS = 'id, country, region, city, status, arrival_date';
const STEP_COLUMNS = 'id, plan_id, step_key, assignee, done_at, done_by, note';

const fmtDay = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Newcomer: the family's first year in a new country, step by step, shared by
 * the family (who's doing each step, and who did it). The same as in the app.
 */
export function NewcomerDashboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const lang = getLang();
  const [plan, setPlan] = useState<NewcomerPlan | null>(null);
  const [rows, setRows] = useState<NewcomerStepRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [hasKids, setHasKids] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('plan');
  const [shown, setShown] = useState<NewcomerPhase | null>(null);
  const [open, setOpen] = useState<NewcomerStep | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user;
    const [{ data: plans }, { data: members }, { data: family }] = await Promise.all([
      supabase.from('newcomer_plans').select(PLAN_COLUMNS).order('created_at').limit(1),
      supabase.from('household_members').select('user_id, display_name').order('joined_at'),
      supabase.from('family_members').select('relationship, birth_date'),
    ]);
    const p = ((plans ?? [])[0] as NewcomerPlan | undefined) ?? null;
    setPlan(p);
    if (p) {
      const { data } = await supabase.from('newcomer_steps').select(STEP_COLUMNS).eq('plan_id', p.id);
      setRows((data ?? []) as NewcomerStepRow[]);
    }
    const list: Person[] = ((members ?? []) as { user_id: string; display_name: string | null }[]).map((m) => ({
      id: m.user_id,
      name: (m.display_name ?? '').split(' ')[0] || 'Family',
      me: m.user_id === me?.id,
    }));
    if (me && !list.some((x) => x.me)) list.unshift({ id: me.id, name: 'You', me: true });
    setPeople(list);
    setHasKids(
      ((family ?? []) as { relationship: string; birth_date: string | null }[]).some(
        (f) => (f.relationship === 'Son' || f.relationship === 'Daughter') && (ageFromBirthDate(f.birth_date) ?? 0) < 18,
      ),
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const saveStep = async (key: string, patch: Partial<Pick<NewcomerStepRow, 'assignee' | 'done_at' | 'done_by' | 'note'>>) => {
    if (!plan) return;
    const { data, error } = await supabase
      .from('newcomer_steps')
      .upsert({ plan_id: plan.id, step_key: key, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'plan_id,step_key' })
      .select(STEP_COLUMNS)
      .single();
    if (error) {
      setProblem(tr('Couldn’t save. Check your connection and try again.'));
      return;
    }
    setProblem(null);
    setRows((r) => [...r.filter((x) => x.step_key !== key), data as NewcomerStepRow]);
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title={tr('Newcomer')} />
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  if (!plan || editing) {
    return (
      <AppShell>
        <PageHeader title={tr('Newcomer')} description={tr('Your first year in a new country, step by step, shared with your family.')} />
        <Setup
          plan={plan}
          onCancel={plan ? () => setEditing(false) : undefined}
          onSave={async (body) => {
            const q = plan ? supabase.from('newcomer_plans').update(body).eq('id', plan.id) : supabase.from('newcomer_plans').insert(body);
            const { data, error } = await q.select(PLAN_COLUMNS).single();
            if (error) return tr('Couldn’t save. Check your connection and try again.');
            setPlan(data as NewcomerPlan);
            setEditing(false);
            return null;
          }}
        />
      </AppShell>
    );
  }

  const country = newcomerCountry(plan.country);
  const steps = stepsFor(country, plan, hasKids);
  const phase = currentPhase(plan.arrival_date);
  const viewing = shown ?? phase;
  const { done, total } = progress(steps, rows);
  const next = nextStep(steps, rows, phase);
  const days = daysInCountry(plan.arrival_date);
  const region = country.regions.find((r) => r.code === plan.region);
  const status = country.statuses.find((s) => s.id === plan.status);
  const rowFor = (key: string) => rows.find((r) => r.step_key === key);
  const nameOf = (id: string | null | undefined) => {
    const p = people.find((x) => x.id === id);
    return p ? (p.me ? tr('you') : p.name) : null;
  };
  const me = people.find((p) => p.me);

  return (
    <AppShell>
      <PageHeader
        title={tr('Newcomer')}
        description={[pick(country.name, lang), region ? pick(region.name, lang) : null, plan.city, status ? pick(status.name, lang) : null].filter(Boolean).join(' · ')}
      >
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          {tr('Change')}
        </Button>
      </PageHeader>

      <div className="max-w-3xl space-y-5">
        <div className="space-y-3 rounded-2xl bg-brand-dark p-5 text-white">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{tr('{0} of {1}', [done, total])}</span>
            <span className="text-sm text-white/80">{tr('steps done by your family')}</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-white/80" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
          </div>
          <p className="text-sm text-white/80">
            {days === null ? tr('Add your arrival date to see where you are.') : days < 0 ? tr('{0} days until you land', [-days]) : tr('Day {0} in {1}', [days + 1, pick(country.name, lang)])}
            {next ? ` · ${tr('Next: {0}', [stepView(next, plan.region, lang).title])}` : ''}
          </p>
        </div>

        <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {(['plan', 'around', 'free', 'discount', 'deal'] as Tab[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn('flex-1 rounded-lg px-3 py-2 text-sm font-semibold', tab === k ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >
              {tr({ plan: 'Our plan', around: 'Getting around', free: 'Free help', discount: 'Discounts', deal: 'Deals' }[k])}
            </button>
          ))}
        </div>

        {problem && <p className="text-sm text-destructive">{problem}</p>}

        {tab === 'plan' ? (
          <>
            <div className="flex flex-wrap gap-2">
              {NEWCOMER_PHASES.map((p) => {
                const inPhase = steps.filter((s) => s.phase === p.id);
                if (!inPhase.length) return null;
                const allDone = inPhase.every((s) => rowFor(s.key)?.done_at);
                return (
                  <button
                    key={p.id}
                    onClick={() => setShown(p.id)}
                    className={cn('rounded-full border px-3 py-1.5 text-sm font-semibold', viewing === p.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}
                  >
                    {tr(p.label)}
                    {allDone ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">{tr('Tap a step to see how to do it, what to bring and where to go.')}</p>
            <div className="space-y-2">
              {steps
                .filter((s) => s.phase === viewing)
                .map((s) => {
                  const v = stepView(s, plan.region, lang);
                  const row = rowFor(s.key);
                  const isDone = !!row?.done_at;
                  return (
                    <Card key={s.key}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start gap-3">
                          <button
                            role="checkbox"
                            aria-checked={isDone}
                            aria-label={v.title}
                            onClick={() => saveStep(s.key, isDone ? { done_at: null, done_by: null } : { done_at: new Date().toISOString(), done_by: me?.id ?? null })}
                            className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', isDone ? 'border-brand-sage bg-brand-sage text-white' : 'border-muted-foreground/40')}
                          >
                            {isDone && <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button className="flex-1 space-y-1.5 text-start" onClick={() => setOpen(s)}>
                            <span className={cn('block font-semibold', isDone && 'text-muted-foreground line-through')}>{v.title}</span>
                            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {s.urgent && !isDone && <Badge variant="destructive">{tr('Urgent')}</Badge>}
                              {s.cost === 'free' && <Badge variant="secondary">{tr('Free')}</Badge>}
                              <span className={cn(isDone && 'font-semibold text-brand-sage')}>
                                {isDone ? tr('Done by {0}', [nameOf(row?.done_by) ?? tr('family')]) : row?.assignee ? nameOf(row.assignee) ?? tr('Family') : tr('Anyone')}
                              </span>
                            </span>
                            {!isDone && <span className="line-clamp-2 block text-sm text-foreground/75">{v.why}</span>}
                          </button>
                        </div>
                        <button onClick={() => setOpen(s)} className="ms-9 flex w-[calc(100%-2.25rem)] items-center gap-3 border-t pt-2.5 text-start">
                          <span className="flex-1 truncate text-xs text-muted-foreground">
                            {[(v.how.length === 1 ? tr('1 step') : tr('{0} steps', [v.how.length])), v.bring ? tr('What to bring') : null, v.tips.length ? tr('Tips') : null, s.place ? tr('Directions') : null].filter(Boolean).join(' · ')}
                          </span>
                          <span className="inline-flex items-center text-sm font-semibold text-primary">
                            {tr('How to do it')} <ChevronRight className="h-4 w-4" />
                          </span>
                        </button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
            <p className="text-xs text-muted-foreground">
              {tr('Checked against official sources on {0}. General guidance, not immigration or legal advice.', [fmtDay(country.checked)])}
            </p>
          </>
        ) : tab === 'around' ? (
          <Around country={country} plan={plan} onDiscounts={() => setTab('discount')} />
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {tab === 'free'
                ? tr('Free help for newcomers, from the government, charities and mosques.')
                : tab === 'discount'
                  ? tr('Most discounts depend on income, and many families qualify in their first year. Apply for each one.')
                  : tr('Offers change often. Check the details on the company’s page before you sign up.')}
            </p>
            {helpFor(country, plan, tab).map((h) => (
              <Card key={h.key}>
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-semibold">{pick(h.title, lang)}</span>
                    {tab === 'free' && <Badge variant="secondary">{tr('Free')}</Badge>}
                  </div>
                  <p className="text-sm text-foreground/80">{pick(h.text, lang)}</p>
                  <p className="text-xs text-muted-foreground">{pick(h.who, lang)}</p>
                  {h.link ? (
                    <a href={h.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      {tab === 'discount' ? tr('How to apply') : tr('Learn more')} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : h.feature === 'halal' ? (
                    <Link href="/dashboard/halal-places" className="text-sm font-semibold text-primary hover:underline">
                      {tr('Open Halal places ›')}
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <StepDialog
        key={open?.key ?? 'none'}
        step={open}
        plan={plan}
        row={open ? rowFor(open.key) : undefined}
        people={people}
        me={me}
        nameOf={nameOf}
        onClose={() => setOpen(null)}
        onSave={saveStep}
        onTab={(t) => {
          setOpen(null);
          setTab(t);
        }}
      />
    </AppShell>
  );
}

function Setup({
  plan,
  onSave,
  onCancel,
}: {
  plan: NewcomerPlan | null;
  onSave: (body: { country: string; region: string | null; city: string | null; status: NewcomerStatus; arrival_date: string | null; updated_at: string }) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const lang = getLang();
  const country = plan?.country ?? 'CA';
  const c = newcomerCountry(country);
  const [region, setRegion] = useState<string | null>(plan?.region ?? null);
  const [city, setCity] = useState(plan?.city ?? '');
  const [status, setStatus] = useState<NewcomerStatus | null>(plan?.status ?? null);
  const [arrival, setArrival] = useState(plan?.arrival_date ?? '');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const pill = (on: boolean) => cn('rounded-full border px-3 py-1.5 text-sm font-semibold', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted');

  return (
    <div className="max-w-2xl space-y-6">
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wide text-primary">{tr('COUNTRY')}</h2>
        <div className="flex flex-wrap gap-2">
          {NEWCOMER_COUNTRIES.map((x) => (
            <span key={x.code} className={pill(x.code === country)}>
              {pick(x.name, lang)}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{tr('More countries are coming: United States, United Kingdom, Australia and more.')}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wide text-primary">{tr('PROVINCE')}</h2>
        <div className="flex flex-wrap gap-2">
          {c.regions.map((r) => (
            <button key={r.code} type="button" className={pill(r.code === region)} onClick={() => setRegion(r.code)}>
              {pick(r.name, lang)}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <label htmlFor="nc-city" className="text-xs font-bold tracking-wide text-primary">
          {tr('CITY')}
        </label>
        <Input id="nc-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={tr('e.g. Ottawa')} maxLength={80} />
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-bold tracking-wide text-primary">{tr('HOW ARE YOU COMING?')}</h2>
        <div className="flex flex-wrap gap-2">
          {c.statuses.map((s) => (
            <button key={s.id} type="button" className={pill(s.id === status)} onClick={() => setStatus(s.id)}>
              {pick(s.name, lang)}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <label htmlFor="nc-arrival" className="text-xs font-bold tracking-wide text-primary">
          {tr('Arrival date').toUpperCase()}
        </label>
        <Input id="nc-arrival" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} className="max-w-xs" />
        <p className="text-xs text-muted-foreground">{tr('Not arrived yet? Leave it empty and your plan starts with “Before you land”.')}</p>
      </section>
      {problem && <p className="text-sm text-destructive">{problem}</p>}
      <div className="flex gap-2">
        <Button
          disabled={!status || busy}
          onClick={async () => {
            if (!status) return;
            setBusy(true);
            const err = await onSave({ country, region, city: city.trim() || null, status, arrival_date: arrival || null, updated_at: new Date().toISOString() });
            setProblem(err);
            setBusy(false);
          }}
        >
          {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {plan ? tr('Save') : tr('Make our plan')}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            {tr('Cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepDialog({
  step,
  plan,
  row,
  people,
  me,
  nameOf,
  onClose,
  onSave,
  onTab,
}: {
  step: NewcomerStep | null;
  plan: NewcomerPlan;
  row?: NewcomerStepRow;
  people: Person[];
  me?: Person;
  nameOf: (id: string | null | undefined) => string | null;
  onClose: () => void;
  onSave: (key: string, patch: Partial<Pick<NewcomerStepRow, 'assignee' | 'done_at' | 'done_by' | 'note'>>) => Promise<void>;
  onTab: (t: Tab) => void;
}) {
  const lang = getLang();
  const [note, setNote] = useState('');
  if (!step) return null;
  const v = stepView(step, plan.region, lang);
  const done = !!row?.done_at;
  const pill = (on: boolean) => cn('rounded-full border px-3 py-1.5 text-sm font-semibold', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {step.urgent && <Badge variant="destructive">{tr('Urgent')}</Badge>}
            {step.cost === 'free' && <Badge variant="secondary">{tr('Free')}</Badge>}
            <Badge variant="outline">{step.who === 'each-adult' ? tr('Each adult') : step.who === 'family' ? tr('Once for the family') : tr('Anyone')}</Badge>
          </div>
          <DialogTitle className="text-xl">{v.title}</DialogTitle>
          <DialogDescription className="text-base text-foreground/80">{v.why}</DialogDescription>
          {v.takes && <p className="text-sm font-semibold text-muted-foreground">⏱ {v.takes}</p>}
        </DialogHeader>
        {v.note && <p className="rounded-lg bg-brand-sage/10 p-3 text-sm">{v.note}</p>}

        <div className="space-y-3 rounded-xl border p-4">
          <h3 className="text-xs font-bold tracking-wide text-primary">{tr('WHO’S DOING IT')}</h3>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <button key={p.id} type="button" className={pill(row?.assignee === p.id)} onClick={() => onSave(step.key, { assignee: p.id })}>
                {p.me ? tr('You') : p.name}
              </button>
            ))}
            <button type="button" className={pill(!row?.assignee)} onClick={() => onSave(step.key, { assignee: null })}>
              {tr('Anyone')}
            </button>
          </div>
          {people.length < 2 && (
            <Link href="/dashboard/family" className="block text-sm font-semibold text-primary hover:underline">
              {tr('Invite your spouse to share the plan ›')}
            </Link>
          )}
          {done ? (
            <div className="space-y-1 rounded-lg bg-brand-sage/10 p-3 text-sm">
              <p className="font-semibold">
                {tr('Done by {0}', [nameOf(row?.done_by) ?? tr('family')])}
                {row?.done_at ? ` · ${fmtDay(row.done_at)}` : ''}
              </p>
              {row?.note && <p>“{row.note}”</p>}
            </div>
          ) : (
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('Add a note for your family (optional)')} maxLength={280} aria-label={tr('Note')} />
          )}
          <Button
            className="w-full"
            variant={done ? 'outline' : 'default'}
            onClick={() => onSave(step.key, done ? { done_at: null, done_by: null } : { done_at: new Date().toISOString(), done_by: me?.id ?? null, note: note.trim() || null })}
          >
            {done ? tr('Mark as not done') : tr('Mark as done')}
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold tracking-wide text-primary">{tr('HOW')}</h3>
          <ol className="list-decimal space-y-1.5 ps-5 text-sm">
            {v.how.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
          {v.bring && (
            <p className="text-sm">
              <span className="font-semibold">{tr('Bring: ')}</span>
              {v.bring}
            </p>
          )}
        </div>

        {v.tips.length > 0 && (
          <div className="space-y-1.5 rounded-xl bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
            <h3 className="text-xs font-bold tracking-wide text-amber-800 dark:text-amber-300">{tr('TIPS')}</h3>
            <ul className="list-disc space-y-1 ps-5">
              {v.tips.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}

        {step.place && (
          <div className="space-y-2 rounded-xl border p-4">
            <h3 className="text-xs font-bold tracking-wide text-primary">{tr('WHERE TO GO')}</h3>
            <p className="text-sm text-foreground/80">{tr('Firdam opens the map with the nearest one, and how to get there by bus with live times.')}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={directionsUrl(step.place, plan, 'transit')} target="_blank" rel="noopener noreferrer">
                  <Bus className="me-1.5 h-4 w-4" />
                  {tr('By bus')}
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={directionsUrl(step.place, plan, 'driving')} target="_blank" rel="noopener noreferrer">
                  <Car className="me-1.5 h-4 w-4" />
                  {tr('By car')}
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={directionsUrl(step.place, plan, 'walking')} target="_blank" rel="noopener noreferrer">
                  <Footprints className="me-1.5 h-4 w-4" />
                  {tr('Walking')}
                </a>
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {step.opens === 'around' && (
            <Button variant="outline" size="sm" onClick={() => onTab('around')}>
              {tr('Open Getting around')}
            </Button>
          )}
          {step.feature === 'halal' && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/halal-places">{tr('Open Halal places')}</Link>
            </Button>
          )}
          {step.opens === 'discounts' && (
            <Button variant="outline" size="sm" onClick={() => onTab('discount')}>
              {tr('See discounts')}
            </Button>
          )}
        </div>
        {v.link && (
          <a href={v.link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {tr('Official page: {0} ›', [v.link.label])} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <p className="text-xs text-muted-foreground">{tr('General guidance, not immigration or legal advice. Rules change: check the official page.')}</p>
      </DialogContent>
    </Dialog>
  );
}

function Around({ country, plan, onDiscounts }: { country: NewcomerCountry; plan: NewcomerPlan; onDiscounts: () => void }) {
  const agency = transitFor(country, plan);
  const list = (items: string[]) => (
    <ul className="list-disc space-y-1 ps-5 text-sm text-foreground/80">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-lg font-bold">{tr('Plan a trip by bus')}</h3>
          <p className="text-sm text-foreground/80">{tr('See the map, which bus to take, where to catch it and when it comes, with live times where your city shares them.')}</p>
          <Button asChild>
            <a href={tripPlannerUrl()} target="_blank" rel="noopener noreferrer">
              <Bus className="me-2 h-4 w-4" />
              {tr('Open the trip planner')}
            </a>
          </Button>
          {agency && (
            <a href={agency.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-primary hover:underline">
              {tr('{0}: fares, passes and service changes ›', [agency.agency])}
            </a>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-5">
          <h3 className="font-semibold">{tr('Bus or Uber?')}</h3>
          {list([
            tr('One person or two: the bus is usually much cheaper. A transit card costs less than paying cash.'),
            tr('A family with young children: many cities let young children ride the bus free or for less. Check your city’s rules.'),
            tr('Taxi or Uber is faster door to door: good when it is very cold, late at night, or you have heavy bags.'),
            tr('Ask the driver or the app for the price first. In a taxi, check the meter is on.'),
          ])}
        </CardContent>
      </Card>
      <div className="space-y-1.5 rounded-xl bg-amber-50 p-5 dark:bg-amber-950/30">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">{tr('Car seats for children')}</h3>
        <p className="text-sm text-foreground/80">
          {tr('In Canada, babies and young children must ride in a car seat or booster that fits their age and size. Taxis and rides like Uber usually don’t bring one, so take yours, or choose the bus.')}
        </p>
      </div>
      <Card>
        <CardContent className="space-y-2 p-5">
          <h3 className="font-semibold">{tr('Winter tips')}</h3>
          {list([tr('Leave earlier when it snows: buses can be late.'), tr('Wait inside the shelter and dress the children warmly: hat, mittens and boots.')])}
        </CardContent>
      </Card>
      <Button variant="outline" onClick={onDiscounts}>
        {tr('See cheaper bus passes')}
      </Button>
      <p className="text-xs text-muted-foreground">
        {tr('Times come from your city’s transit system through the map. Firdam’s own live bus times, with warnings when a bus may not come, are coming next.')}
      </p>
    </div>
  );
}
