'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Archive, BookOpen, ShoppingCart, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { MealsTabs } from '@/features/meals/meals-tabs';
import { getLang, tr } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDateISO, getStartOfWeek } from '@/features/meals/plan-core';
import { optionView, type LunchboxDay, type LunchboxIdea } from '@/features/lunchbox/lunchbox-core';
import { ageLabel, littleChanges } from '@/features/little-plates/little-plates-core';
import { useLittleOnes } from '@/features/little-plates/little-plates-web';

type Slot = { type: string; name: string; image?: string; needsAI?: string; ingredients: string[] };
type Lunch = { title: string; sub: string; action: string; image: string | null } | null;

/** The next school day (Monday to Friday) after today, and the Monday of its week. */
function nextSchoolDay(now = new Date()) {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  let steps = 0;
  do {
    d.setDate(d.getDate() + 1);
    steps++;
  } while (d.getDay() === 0 || d.getDay() === 6);
  return { date: formatDateISO(d), weekStart: formatDateISO(getStartOfWeek(d)), isTomorrow: steps === 1 };
}

/**
 * Kitchen's front page: tonight's dinner, the children's next lunchbox, and
 * Recipes, Shopping and Pantry one click away. The same as the phone app.
 */
export function KitchenHome() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const lang = getLang();
  const [slots, setSlots] = useState<Slot[] | null | undefined>(undefined);
  const [lunch, setLunch] = useState<Lunch | undefined>(undefined);
  const [toBuy, setToBuy] = useState(0);
  const [expiring, setExpiring] = useState(0);
  const [pantryCount, setPantryCount] = useState(0);

  useEffect(() => {
    const db = supabase as unknown as { from: (t: string) => any };
    const today = formatDateISO(new Date());
    const week = formatDateISO(getStartOfWeek());

    db.from('meal_plans')
      .select('plan_data, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: { data: { plan_data: any }[] | null }) => {
        const plan = (data ?? []).find((p) => p.plan_data?.weekStartDate === week)?.plan_data;
        const order = ['breakfast', 'lunch', 'dinner', 'snack'];
        const meals = [...(plan?.days?.find((d: any) => d.date === today)?.meals ?? [])].sort((x: any, y: any) => order.indexOf(x.type) - order.indexOf(y.type));
        setSlots(
          meals.length
            ? meals.map((m: any) => ({ type: m.type, name: m.name, image: m.image, needsAI: m.needsAI, ingredients: (m.ingredients ?? []).map((i: any) => i.name) }))
            : null
        );
      });

    db.from('grocery_items')
      .select('id', { count: 'exact', head: true })
      .eq('checked', false)
      .then(({ count }: { count: number | null }) => setToBuy(count ?? 0));

    db.from('pantry_items')
      .select('expiration_date')
      .then(({ data }: { data: { expiration_date: string | null }[] | null }) => {
        const rows = data ?? [];
        const t = new Date(`${today}T12:00:00`).getTime();
        setPantryCount(rows.length);
        setExpiring(rows.filter((r) => r.expiration_date && (new Date(`${r.expiration_date}T12:00:00`).getTime() - t) / 86_400_000 <= 3).length);
      });

    const target = nextSchoolDay();
    const when = target.isTomorrow ? tr('Tomorrow') : tr('Monday');
    db.from('lunchbox_plans')
      .select('children, days')
      .eq('week_start', target.weekStart)
      .maybeSingle()
      .then(async ({ data }: { data: { children: { name: string }[]; days: LunchboxDay[] } | null }) => {
        const day = data?.days?.find((d) => d.date === target.date);
        const names = (data?.children ?? []).map((c) => c.name).filter(Boolean).join(', ');
        if (!day) {
          setLunch({ title: tr('Plan the school lunchboxes'), sub: tr('3 nut-free, halal ideas a day for your children to pick.'), action: tr('Plan lunchboxes'), image: null });
          return;
        }
        if (day.chosen === null) {
          setLunch({
            title: target.isTomorrow ? tr('Tomorrow’s lunchbox isn’t picked yet') : tr('Monday’s lunchbox isn’t picked yet'),
            sub: names ? tr('3 nut-free, halal ideas for {0}', [names]) : tr('3 nut-free, halal ideas ready'),
            action: tr('Let them choose'),
            image: null,
          });
          return;
        }
        const option = day.options[day.chosen];
        let ideas: LunchboxIdea[] = [];
        if (option?.kind === 'idea') {
          const { data: rows } = await db.from('lunchbox_ideas').select('*').eq('id', option.id);
          ideas = (rows ?? []) as LunchboxIdea[];
        }
        const v = option ? optionView(option, ideas, lang) : null;
        setLunch({
          title: tr('{0}: {1}', [when, v?.name ?? '']),
          sub: names ? tr('Picked by {0}', [names]) : tr('Picked'),
          action: tr('See the week'),
          image: v?.image ?? null,
        });
      });
  }, [supabase, lang]);

  return (
    <AppShell>
      <PageHeader title={tr('Kitchen')} description={tr('Meals, lunchboxes, recipes, shopping and pantry in one place.')} />
      <div className="mx-auto max-w-3xl space-y-4">
        <MealsTabs active="kitchen" />
        <Link href="/dashboard/meals" className="block rounded-3xl bg-[#3B2A24] p-5 text-[#FFFDF9] transition-opacity hover:opacity-95">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide text-[#E3CDB4]">{tr('TODAY’S MEALS')}</span>
            <span className="text-xs font-bold text-[#E3CDB4]">{tr('Whole week ›')}</span>
          </div>
          {slots ? (
            <ul className="mt-3 space-y-2">
              {slots.map((m) => (
                <li key={m.type} className="flex items-center gap-3">
                  {m.needsAI || !m.image ? (
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[#E3CDB4]" aria-hidden>
                      ✨
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold tracking-wide text-[#E3CDB4]">{tr(m.type[0].toUpperCase() + m.type.slice(1)).toUpperCase()}</span>
                    <span className="block truncate font-semibold">{m.needsAI ? tr('New {0} idea', [tr(m.needsAI)]) : tr(m.name)}</span>
                  </span>
                  {m.needsAI && <span className="text-xs font-bold text-[#E3CDB4]">{tr('Create')}</span>}
                </li>
              ))}
            </ul>
          ) : slots === null ? (
            <div className="mt-3 space-y-1">
              <p className="text-lg font-extrabold">{tr('Plan your week in seconds')}</p>
              <p className="text-sm text-[#E3CDB4]">{tr('Halal meals sized for your family, with a shopping list that fills itself.')}</p>
            </div>
          ) : (
            <div className="mt-3 h-24" />
          )}
        </Link>

        <LittlePlatesCard slots={slots ?? []} />

        <Link href="/dashboard/lunchbox" className="flex items-center gap-4 rounded-3xl bg-[#E3EDE6] p-5 text-[#24402F] transition-opacity hover:opacity-95">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-xs font-bold tracking-wide text-[#2F5A40]">{tr('SCHOOL LUNCHBOXES')}</p>
            <p className="text-lg font-extrabold leading-tight">{lunch?.title ?? ' '}</p>
            <p className="text-sm text-[#2F5A40]">{lunch?.sub ?? ' '}</p>
            {lunch && <span className="mt-1 inline-block rounded-xl bg-[#2F5A40] px-3.5 py-2 text-sm font-bold text-[#FFFDF9]">{lunch.action}</span>}
          </div>
          {lunch?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lunch.image} alt="" className="h-24 w-24 rounded-2xl object-cover" />
          ) : (
            <div aria-hidden className="grid h-20 w-24 grid-cols-2 gap-1 rounded-2xl border-[3px] border-[#4C7A5D] bg-[#FFFDF9] p-1.5">
              <span className="rounded-md bg-[#F3E6D3]" />
              <span className="rounded-md bg-[#F6DCD3]" />
              <span className="rounded-md bg-[#E3EDE6]" />
              <span className="rounded-md bg-[#EFE4D8]" />
            </div>
          )}
        </Link>

        <div className="grid grid-cols-3 gap-3">
          <Tile href="/dashboard/recipes" icon={<BookOpen className="h-5 w-5 text-[#855C49]" />} tint="bg-[#EFE4D8]" title={tr('Recipes')} sub={tr('Halal library')} />
          <Tile
            href="/dashboard/shopping"
            icon={<ShoppingCart className="h-5 w-5 text-[#6B4A1E]" />}
            tint="bg-[#F3E6D3]"
            title={tr('Shopping')}
            sub={toBuy ? tr('{0} to buy', [toBuy]) : tr('All done')}
            subClass={toBuy ? 'text-[#6B4A1E]' : undefined}
          />
          <Tile
            href="/dashboard/pantry"
            icon={<Archive className="h-5 w-5 text-[#7A3229]" />}
            tint="bg-[#F6DCD3]"
            title={tr('Pantry')}
            sub={expiring ? tr('{0} expire soon', [expiring]) : tr('{0} items', [pantryCount])}
            subClass={expiring ? 'text-[#7A3229]' : undefined}
          />
        </div>

      </div>
    </AppShell>
  );
}

/** Little Plates: the little one's plate for tonight's dinner (or the next meal of the day). */
function LittlePlatesCard({ slots }: { slots: Slot[] }) {
  const ones = useLittleOnes();
  const eating = ones.filter((o) => o.stage);
  const youngest = eating[0];
  if (!ones.length) {
    return (
      <Link href="/dashboard/family" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E6D3]">
          <Sparkles className="h-5 w-5 text-[#6B4A1E]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{tr('Little Plates')}</p>
          <p className="text-xs text-muted-foreground">{tr('Add a little one’s birth date in Family to see baby and toddler versions of your meals.')}</p>
        </div>
      </Link>
    );
  }
  const real = slots.filter((m) => !m.needsAI);
  const target = real.find((m) => m.type === 'dinner') ?? real.find((m) => m.type === 'lunch') ?? real[0];
  const names = eating.map((o) => o.name).join(', ');
  const changes = youngest?.stage && target ? littleChanges(target.ingredients, youngest.stage).filter((c) => c.action !== 'allergen') : [];
  const title = !youngest
    ? tr('Milk only for now')
    : target
      ? target.type === 'dinner'
        ? tr('{0}’s plate tonight', [names])
        : tr('{0}’s plate today', [names])
      : tr('{0}’s plates', [names]);
  const sub = !youngest
    ? tr('{0} is under 6 months: milk only for now. Baby versions start at about 6 months.', [ones.map((o) => o.name).join(', ')])
    : !target
      ? tr('Open any meal to see its baby or toddler version.')
      : changes.length === 1
        ? tr('{0}: 1 change. {1}', [tr(target.name), tr(changes[0].text)])
        : changes.length
          ? tr('{0}: {1} changes, starting with: {2}', [tr(target.name), changes.length, tr(changes[0].text)])
          : tr('{0} is ready for little ones. Just adjust the texture.', [tr(target.name)]);
  return (
    <Link href="/dashboard/meals" className="block space-y-1.5 rounded-3xl bg-[#F3E6D3] p-5 text-[#4A3416] transition-opacity hover:opacity-95">
      <p className="text-xs font-bold tracking-wide text-[#6B4A1E]">
        {youngest ? tr('LITTLE PLATES · {0}', [`${names.toUpperCase()}, ${ageLabel(youngest.months).toUpperCase()}`]) : tr('LITTLE PLATES')}
      </p>
      <p className="text-lg font-extrabold leading-tight">{title}</p>
      <p className="text-sm text-[#6B4A1E]">{sub}</p>
      {youngest && target && <span className="mt-1 inline-block rounded-xl bg-[#6B4A1E] px-3.5 py-2 text-sm font-bold text-white">{tr('See {0}’s plate', [eating[0].name])}</span>}
    </Link>
  );
}

function Tile({ href, icon, tint, title, sub, subClass }: { href: string; icon: React.ReactNode; tint: string; title: string; sub: string; subClass?: string }) {
  return (
    <Link href={href} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
      <span className="text-sm font-extrabold text-foreground">{title}</span>
      <span className={`truncate text-xs font-semibold ${subClass ?? 'text-muted-foreground'}`}>{sub}</span>
    </Link>
  );
}
