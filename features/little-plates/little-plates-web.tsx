'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { getLang, tr } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  LITTLE_STAGES,
  ageLabel,
  guideKey,
  littleChanges,
  littleOnesFromFamily,
  type LittleAction,
  type LittleGuide,
  type LittleGuideSet,
  type LittleOne,
  type LittleStage,
} from '@/features/little-plates/little-plates-core';

const ACTION: Record<LittleAction, { label: string; cls: string }> = {
  'leave out': { label: 'Leave out', cls: 'bg-[#F6DCD3] text-[#7A3229]' },
  'set aside first': { label: 'Set aside first', cls: 'bg-[#F3E6D3] text-[#6B4A1E]' },
  cut: { label: 'Cut', cls: 'bg-[#F3E6D3] text-[#6B4A1E]' },
  'cook through': { label: 'Cook through', cls: 'bg-[#F3E6D3] text-[#6B4A1E]' },
  remove: { label: 'Remove', cls: 'bg-[#EFE4D8] text-[#855C49]' },
  less: { label: 'Use less', cls: 'bg-[#EFE4D8] text-[#855C49]' },
  allergen: { label: 'Allergen', cls: 'bg-white text-[#2F5A40]' },
};

let onesCache: Promise<LittleOne[]> | null = null;

/** Children under 4 in the family profile. */
export function useLittleOnes(): LittleOne[] {
  const [ones, setOnes] = useState<LittleOne[]>([]);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    onesCache ??= Promise.resolve(supabase.from('family_members').select('first_name, relationship, birth_date')).then(({ data }) =>
      littleOnesFromFamily((data ?? []) as { first_name: string; relationship: string; birth_date: string | null }[])
    );
    let alive = true;
    onesCache.then((o) => alive && setOnes(o)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return ones;
}

/**
 * Little Plates on a recipe or meal: the baby or toddler version for each
 * little one in the family (only shown when the family has a child under 4).
 * The same as in the phone app.
 */
export function LittlePlatesWeb({
  id,
  name,
  ingredients,
  steps,
  allergies = [],
  className,
}: {
  id?: string | null;
  name: string;
  ingredients: string[];
  steps: string[];
  allergies?: string[];
  className?: string;
}) {
  const ones = useLittleOnes();
  const stages = useMemo(() => Array.from(new Set(ones.map((o) => o.stage).filter((s): s is LittleStage => !!s))), [ones]);
  const [picked, setPicked] = useState<LittleStage | null>(null);
  const stage = picked && stages.includes(picked) ? picked : (stages[0] ?? null);
  const onMilk = ones.filter((o) => !o.stage);
  if (!ones.length) return null;

  return (
    <section className={cn('space-y-3', className)} aria-label={tr('Little Plates')}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-foreground">{tr('Little Plates')}</h2>
        <span className="text-xs text-muted-foreground">{tr('Baby and toddler version')}</span>
      </div>
      {stages.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {stages.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === stage}
              onClick={() => setPicked(s)}
              className={cn('rounded-xl border px-3 py-1.5 text-sm font-semibold', s === stage ? 'border-[#2F5A40] bg-[#2F5A40] text-white' : 'border-border')}
            >
              {ones
                .filter((o) => o.stage === s)
                .map((o) => o.name)
                .join(', ')}
            </button>
          ))}
        </div>
      )}
      {stage && <StageCard key={stage} stage={stage} id={id} name={name} ingredients={ingredients} steps={steps} allergies={allergies} kids={ones.filter((o) => o.stage === stage)} />}
      {onMilk.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {tr('{0} is under 6 months: milk only for now. Solid food usually starts at around 6 months.', [onMilk.map((b) => b.name).join(', ')])}
        </p>
      )}
    </section>
  );
}

function StageCard({
  stage,
  id,
  name,
  ingredients,
  steps,
  allergies,
  kids,
}: {
  stage: LittleStage;
  id?: string | null;
  name: string;
  ingredients: string[];
  steps: string[];
  allergies: string[];
  kids: LittleOne[];
}) {
  const info = LITTLE_STAGES.find((s) => s.id === stage)!;
  const changes = useMemo(() => littleChanges(ingredients, stage, allergies), [ingredients, stage, allergies]);
  const [guide, setGuide] = useState<LittleGuide | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error' | 'limit'>('loading');
  const lang = getLang();

  useEffect(() => {
    let alive = true;
    const supabase = createSupabaseBrowserClient();
    const key = guideKey(id, name);
    (async () => {
      const db = supabase as unknown as { from: (t: string) => any };
      const { data: saved } = await db.from('little_plates').select('guide').eq('recipe_key', key).eq('stage', stage).maybeSingle();
      let set = saved?.guide as LittleGuideSet | undefined;
      if (!set) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('auth');
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/little-plates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
          body: JSON.stringify({ key, name, ingredients, steps, stage }),
        });
        const json = (await res.json().catch(() => null)) as { guide?: LittleGuideSet; error?: string } | null;
        if (!res.ok || !json?.guide) throw new Error(json?.error === 'limit' ? 'limit' : 'error');
        set = json.guide;
      }
      if (!alive) return;
      setGuide(set[lang] ?? set.en ?? null);
      setState('done');
    })().catch((e: Error) => alive && setState(e.message === 'limit' ? 'limit' : 'error'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, name, stage, lang]);

  return (
    <div className="space-y-4 rounded-2xl border border-[#CFE0C6] bg-[#E3EDE6] p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
      <div>
        <p className="text-xs font-bold tracking-wide text-[#2F5A40] dark:text-emerald-300">
          {tr('{0} · {1}', [tr(info.label).toUpperCase(), tr(info.ages)])}
        </p>
        <p className="font-semibold text-[#24402F] dark:text-emerald-100">{kids.map((k) => `${k.name} (${ageLabel(k.months)})`).join(', ')}</p>
        <p className="text-sm text-[#2F5A40] dark:text-emerald-300">{tr(info.texture)}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold tracking-wide text-[#2F5A40] dark:text-emerald-300">{tr('Safety changes')}</p>
        {changes.length ? (
          changes.map((c, i) => (
            <div key={i} className="space-y-1 rounded-xl bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', ACTION[c.action].cls)}>{tr(ACTION[c.action].label)}</span>
                <span className="text-sm font-semibold text-foreground">
                  {c.ingredient
                    .split(', ')
                    .map((x) => tr(x))
                    .join(', ')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{tr(c.text)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#2F5A40] dark:text-emerald-300">{tr('No safety changes needed for this meal. Just adjust the texture.')}</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold tracking-wide text-[#2F5A40] dark:text-emerald-300">{tr('How to make it')}</p>
        {state === 'loading' ? (
          <p className="flex items-center gap-2 text-sm text-[#2F5A40] dark:text-emerald-300">
            <Loader2 className="h-4 w-4 animate-spin" /> {tr('Preparing the little one’s version…')}
          </p>
        ) : guide ? (
          <>
            <ol className="space-y-2">
              {guide.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-[#2F5A40]">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
            {guide.serve && (
              <p className="text-sm text-foreground">
                <span className="font-semibold">{tr('Serve: ')}</span>
                {guide.serve}
              </p>
            )}
            {guide.portion && (
              <p className="text-sm text-foreground">
                <span className="font-semibold">{tr('Portion: ')}</span>
                {guide.portion}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-[#2F5A40] dark:text-emerald-300">
            {state === 'limit'
              ? tr('You’ve opened many new Little Plates today. Try again tomorrow; the safety changes above still apply.')
              : tr('The steps couldn’t load just now. The safety changes above still apply.')}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{tr('General guidance, not medical advice. Ask your doctor or health visitor about allergies and new foods.')}</p>
    </div>
  );
}
