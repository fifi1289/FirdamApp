'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/features/budget/budget-config';
import { AFFILIATE_NOTE, amazonIsAffiliate } from '@/features/groceries/shop-links';
import {
  LUNCHBOX_DAY_NAMES,
  LUNCHBOX_MIN_AGE,
  childrenFromFamily,
  chooseOption,
  dinnersFromPlan,
  optionView,
  pickedCount,
  toolLinks,
  type LunchboxChild,
  type LunchboxDay,
  type LunchboxIdea,
  type LunchboxPlan,
} from '@/features/lunchbox/lunchbox-core';
import { MealsTabs } from '@/features/meals/meals-tabs';
import { formatDateISO, getStartOfWeek } from '@/features/meals/plan-core';
import { getLang, locale, tr } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Week = 'this' | 'next';
type PickChild = LunchboxChild & { on: boolean };
type PlanDays = { days: { date: string; meals: { type: string; name: string; ingredients?: { name: string }[] }[] }[] };

/**
 * School lunchboxes: a week (Monday to Friday) with 3 options a day, so the
 * child picks. Never nuts, always halal, the children's allergies avoided,
 * safe for little ones. The same as in the phone app.
 */
export function LunchboxDashboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { currency } = useCurrency();
  const lang = getLang();
  const [week, setWeek] = useState<Week>(() => ([0, 6].includes(new Date().getDay()) ? 'next' : 'this'));
  const weekStart = useMemo(() => {
    const d = getStartOfWeek();
    if (week === 'next') d.setDate(d.getDate() + 7);
    return formatDateISO(d);
  }, [week]);

  const [plan, setPlan] = useState<LunchboxPlan | null>(null);
  const [ideas, setIdeas] = useState<LunchboxIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [allergyChoices, setAllergyChoices] = useState<string[]>([]);
  const [household, setHousehold] = useState<string[]>([]);
  const [mealPlan, setMealPlan] = useState<PlanDays | null>(null);
  const [babies, setBabies] = useState<string[]>([]);
  const [children, setChildren] = useState<PickChild[]>([]);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [day, setDay] = useState(0);
  const [showOthers, setShowOthers] = useState(false);
  useEffect(() => setShowOthers(false), [day, weekStart]);

  useEffect(() => {
    supabase
      .from('allergens')
      .select('name')
      .order('name')
      .then(({ data }) => setAllergyChoices(((data ?? []) as { name: string }[]).map((r) => r.name)));
    supabase
      .from('meal_preferences')
      .select('allergies')
      .maybeSingle()
      .then(({ data }) => setHousehold(((data as { allergies?: string[] } | null)?.allergies ?? []) as string[]));
  }, [supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);
    try {
      const [{ data: saved }, { data: members }, { data: plans }] = await Promise.all([
        supabase.from('lunchbox_plans').select('week_start, children, days').eq('week_start', weekStart).maybeSingle(),
        supabase.from('family_members').select('first_name, relationship, birth_date'),
        supabase.from('meal_plans').select('plan_data, created_at').order('created_at', { ascending: false }).limit(30),
      ]);
      const fam = childrenFromFamily((members ?? []) as { first_name: string; relationship: string; birth_date: string | null }[]);
      setBabies(fam.filter((c) => c.tooYoung).map((c) => c.name));
      const row = ((plans ?? []) as unknown as { plan_data: { weekStartDate?: string } & PlanDays }[]).find((p) => p.plan_data?.weekStartDate === weekStart);
      setMealPlan(row?.plan_data ?? null);

      let current: LunchboxPlan | null = null;
      if (saved) {
        current = { weekStart, children: (saved.children ?? []) as LunchboxChild[], days: (saved.days ?? []) as LunchboxDay[] };
        const ids = Array.from(new Set(current.days.flatMap((d) => d.options.flatMap((o) => (o.kind === 'idea' ? [o.id] : [])))));
        const { data: rows } = ids.length ? await supabase.from('lunchbox_ideas').select('*').in('id', ids) : { data: [] };
        setIdeas((rows ?? []) as LunchboxIdea[]);
      } else {
        setIdeas([]);
      }
      setPlan(current);
      const last = current?.children ?? [];
      const fromFamily = fam
        .filter((c) => !c.tooYoung)
        .map((c) => ({ name: c.name, age: c.age, allergies: last.find((l) => l.name === c.name)?.allergies ?? [], on: true }));
      const extra = last.filter((l) => !fromFamily.some((m) => m.name === l.name)).map((l) => ({ ...l, on: true }));
      setChildren([...fromFamily, ...extra]);
      setEditing(!current);
      const today = new Date().getDay();
      setDay(week === 'this' && today >= 1 && today <= 5 ? today - 1 : 0);
    } catch {
      setProblem(tr('Lunchboxes could not be loaded. Please refresh the page.'));
    } finally {
      setLoading(false);
    }
  }, [supabase, weekStart, week]);

  useEffect(() => {
    load();
  }, [load]);

  const picked = children.filter((c) => c.on);

  const generate = async () => {
    if (!picked.length) return setProblem(tr('Choose at least one child.'));
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error(tr('Please sign in again.'));
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lunchbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({
          action: 'plan',
          weekStart,
          children: picked.map(({ name, age, allergies }) => ({ name, age, allergies })),
          allergies: household,
          leftovers: dinnersFromPlan(mealPlan),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { children?: LunchboxChild[]; days?: LunchboxDay[]; ideas?: LunchboxIdea[]; aiNote?: string | null; error?: string }
        | null;
      if (!res.ok || !json?.days) throw new Error(tr(json?.error ?? 'Lunchboxes could not be planned just now. Please try again.'));
      setPlan({ weekStart, children: json.children ?? picked, days: json.days });
      setIdeas(json.ideas ?? []);
      setEditing(false);
      if (json.aiNote === 'limit') setNote(tr('Some lunchboxes repeat this week because new AI ideas for these allergies are used up this month.'));
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const choose = (date: string, index: number) => {
    if (!plan) return;
    const current = plan.days.find((d) => d.date === date)?.chosen;
    const next = chooseOption(plan, date, current === index ? null : index);
    setShowOthers(false);
    setPlan(next);
    supabase
      .from('lunchbox_plans')
      .update({ days: next.days, updated_at: new Date().toISOString() })
      .eq('week_start', next.weekStart)
      .then(() => undefined);
  };

  const addChild = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const age = Number(newAge);
    if (!name) return setProblem(tr('Enter the child’s name.'));
    if (!Number.isFinite(age) || age < LUNCHBOX_MIN_AGE || age > 17) return setProblem(tr('Enter an age from 2 to 17.'));
    setChildren((c) => [...c, { name, age: Math.floor(age), allergies: [], on: true }]);
    setNewName('');
    setNewAge('');
    setProblem(null);
  };

  const toggleAllergy = (i: number, a: string) =>
    setChildren((all) =>
      all.map((x, j) => (j === i ? { ...x, allergies: x.allergies.includes(a) ? x.allergies.filter((y) => y !== a) : [...x.allergies, a] } : x))
    );

  const current = plan?.days[day];
  const dateLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

  return (
    <AppShell>
      <PageHeader
        title={tr('School lunchboxes')}
        description={tr('3 lunchbox ideas a day, so your child picks. Always nut-free and halal, with no sweets, and safe for little ones.')}
      />
      <div className="space-y-5">
        <MealsTabs active="lunchbox" />
        <div className="inline-flex rounded-xl border border-border p-1">
          {(['this', 'next'] as Week[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeek(w)}
              className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold', week === w ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {w === 'this' ? tr('This week') : tr('Next week')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {babies.length > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
                <CardContent className="space-y-1 p-4">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">{tr('Little Plates for the little ones')}</p>
                  <p className="text-sm text-amber-900/90 dark:text-amber-200/90">
                    {tr('{0} is under 2, so lunchboxes are not for them yet. Open any meal in your meal plan to see its baby or toddler version.', [babies.join(', ')])}
                  </p>
                </CardContent>
              </Card>
            )}

            {editing || !plan ? (
              <Card>
                <CardContent className="space-y-5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('Who needs a lunchbox?')}</p>
                  {children.length === 0 && <p className="text-sm text-muted-foreground">{tr('Add your children here, or in Family with their birth date.')}</p>}
                  {children.map((c, i) => (
                    <div key={`${c.name}-${i}`} className="space-y-2 border-b border-border/60 pb-4">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={c.on}
                          onChange={() => setChildren((all) => all.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                          className="h-5 w-5 accent-[hsl(var(--primary))]"
                        />
                        <span className="font-semibold text-foreground">{c.name}</span>
                        {c.age !== null && <span className="text-sm text-muted-foreground">· {tr('{0} years', [c.age])}</span>}
                      </label>
                      {c.on && allergyChoices.length > 0 && (
                        <div className="space-y-1.5 ps-8">
                          <p className="text-xs text-muted-foreground">{tr('Allergies for {0} (nuts are always left out)', [c.name])}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {allergyChoices
                              .filter((a) => a !== 'Peanuts' && a !== 'Tree nuts')
                              .map((a) => {
                                const fromFamily = household.includes(a);
                                const on = fromFamily || c.allergies.includes(a);
                                return (
                                  <button
                                    key={a}
                                    type="button"
                                    disabled={fromFamily}
                                    onClick={() => toggleAllergy(i, a)}
                                    className={cn(
                                      'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                                      on ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-muted',
                                      fromFamily && 'opacity-80'
                                    )}
                                  >
                                    {tr(a)}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <form onSubmit={addChild} className="grid grid-cols-[1fr_90px_auto] gap-2">
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={tr('Child’s name')} aria-label={tr('Child’s name')} />
                    <Input value={newAge} onChange={(e) => setNewAge(e.target.value)} inputMode="numeric" placeholder={tr('Age')} aria-label={tr('Age')} />
                    <Button type="submit" variant="outline">
                      {tr('Add')}
                    </Button>
                  </form>
                  {household.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {tr('Family allergies from your meal preferences are always avoided: {0}.', [household.map((a) => tr(a)).join(', ')])}
                    </p>
                  )}
                  {mealPlan && <p className="text-xs text-muted-foreground">{tr('Last night’s dinner from your meal plan becomes a leftover option when it’s safe.')}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={generate} disabled={busy}>
                      {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Sparkles className="me-2 h-4 w-4" />}
                      {busy ? tr('Planning…') : plan ? tr('Plan new lunchboxes') : tr('Plan this week’s lunchboxes')}
                    </Button>
                    {plan && (
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        {tr('Cancel')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {tr('For {0} · {1} of 5 days picked', [plan.children.map((c) => c.name).join(', '), pickedCount(plan)])}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    {tr('Change')}
                  </Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
                  {plan.days.map((d, i) => (
                    <button
                      key={d.date}
                      type="button"
                      role="tab"
                      aria-selected={i === day}
                      onClick={() => setDay(i)}
                      className={cn(
                        'min-w-[96px] rounded-xl border px-3 py-2 text-center',
                        i === day ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted'
                      )}
                    >
                      <span className="block text-sm font-bold">{tr(LUNCHBOX_DAY_NAMES[i] ?? '')}</span>
                      <span className="block text-xs opacity-80">
                        {d.chosen !== null ? '✓ ' : ''}
                        {dateLabel(d.date)}
                      </span>
                    </button>
                  ))}
                </div>

                {current && (
                  <>
                    {current.chosen === null && <p className="text-sm text-muted-foreground">{tr('Show these to your child and let them pick one.')}</p>}
                    <div className={cn('grid gap-4', current.chosen === null || showOthers ? 'md:grid-cols-3' : 'max-w-xl')}>
                      {current.options.map((o, i) => {
                        const v = optionView(o, ideas, lang);
                        if (!v) return null;
                        const chosen = current.chosen === i;
                        // Once a lunchbox is picked, it opens up with how to make it; the other ideas fold away.
                        if (current.chosen !== null && !chosen && !showOthers) return null;
                        const links = toolLinks(v, currency);
                        return (
                          <Card key={v.key} className={cn('flex flex-col overflow-hidden', chosen && 'ring-2 ring-primary')}>
                            {v.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={v.image} alt={v.name} className="aspect-[3/2] w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex aspect-[3/2] w-full items-center justify-center bg-muted text-5xl" aria-hidden>
                                {v.leftover ? '🥡' : '🍱'}
                              </div>
                            )}
                            <CardContent className="flex flex-1 flex-col gap-3 p-4">
                              {chosen && (
                                <span className="self-start rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                                  {tr('✓ Picked for {0}', [tr(LUNCHBOX_DAY_NAMES[day] ?? '')])}
                                </span>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-foreground">{v.name}</h3>
                                {v.leftover && <Badge variant="secondary">{tr('Leftovers')}</Badge>}
                              </div>
                              {chosen && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('What goes in')}</p>}
                              <ul className="list-disc space-y-0.5 ps-5 text-sm text-foreground">
                                {v.items.map((it) => (
                                  <li key={it}>{it}</li>
                                ))}
                              </ul>
                              {chosen && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('How to make it')}</p>
                                  {v.steps.length ? (
                                    <ol className="space-y-2">
                                      {v.steps.map((st, n) => (
                                        <li key={n} className="flex gap-3 text-sm text-foreground">
                                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{n + 1}</span>
                                          <span className="pt-0.5">{st}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">{tr('The steps for this lunchbox are being written. Check back in a few minutes.')}</p>
                                  )}
                                </div>
                              )}
                              <p className="rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">✨ {v.fun_tip}</p>
                              {chosen && links.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('Handy tools')}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {links.map((l) => (
                                      <a
                                        key={l.url}
                                        href={l.url}
                                        target="_blank"
                                        rel={l.affiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
                                        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                                      >
                                        {l.label} <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!chosen && (
                                <Button className="mt-auto" onClick={() => choose(current.date, i)}>
                                  {tr('Pick this one')}
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    {current.chosen !== null && (
                      <Button variant="outline" onClick={() => setShowOthers((x) => !x)}>
                        {showOthers ? tr('Hide the other ideas') : tr('Change: see the other {0} ideas', [current.options.length - 1])}
                      </Button>
                    )}
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  {tr('Pack with an ice pack and check every label for allergens.')}
                  {amazonIsAffiliate(currency) ? ` ${tr(AFFILIATE_NOTE)}` : ''}
                </p>
              </>
            )}
            {note && <p className="text-sm text-amber-800 dark:text-amber-300">{note}</p>}
            {problem && <p className="text-sm text-destructive">{problem}</p>}
          </>
        )}
      </div>
    </AppShell>
  );
}
