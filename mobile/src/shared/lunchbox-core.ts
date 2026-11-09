// GENERATED from features/lunchbox/lunchbox-core.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * School lunchbox planner: shared by the website and the phone app (the app
 * gets a copy via mobile/scripts/sync-shared.mjs). The plan itself is made by
 * the "lunchbox" edge function, which checks every lunchbox (never nuts, halal,
 * the children's allergies, no choking hazards for under-4s, no sweets).
 */
import { amazonToolUrl } from './shop-links';
import { tr } from '@/lib/i18n';

export type LunchboxLang = 'en' | 'fr' | 'ar';

export interface LunchboxText {
  name: string;
  items: string[];
  fun_tip: string;
  tools: string[];
}

export interface LunchboxIdea extends LunchboxText {
  id: string;
  tags: string[];
  min_age: number;
  image_path: string | null;
  source: string;
  i18n: Partial<Record<'fr' | 'ar', Partial<LunchboxText>>>;
}

export type LunchboxOption =
  | { kind: 'idea'; id: string }
  | ({ kind: 'leftover'; dinner: string } & LunchboxText);

export interface LunchboxDay {
  date: string;
  options: LunchboxOption[];
  /** Which option the child picked (index into options), or null. */
  chosen: number | null;
}

export interface LunchboxChild {
  name: string;
  age: number | null;
  allergies: string[];
}

export interface LunchboxPlan {
  weekStart: string;
  children: LunchboxChild[];
  days: LunchboxDay[];
}

/** Lunchboxes are for school-age children; babies get "Little Plates" (coming soon). */
export const LUNCHBOX_MIN_AGE = 2;

/** Whole years between a birth date (YYYY-MM-DD) and today, or null. */
export function ageFromBirthDate(birth: string | null | undefined, today: Date = new Date()): number | null {
  if (!birth || !/^\d{4}-\d{2}-\d{2}/.test(birth)) return null;
  const [y, m, d] = birth.slice(0, 10).split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age >= 0 && age < 120 ? age : null;
}

/** Sons and daughters from the family profile who are old enough for a lunchbox (age 2 to 17, or no birth date). */
export function childrenFromFamily(
  members: { first_name: string; relationship: string; birth_date: string | null }[],
  today: Date = new Date(),
): { name: string; age: number | null; tooYoung: boolean }[] {
  return members
    .filter((m) => m.relationship === 'Son' || m.relationship === 'Daughter')
    .map((m) => {
      const age = ageFromBirthDate(m.birth_date, today);
      return { name: m.first_name, age, tooYoung: age !== null && age < LUNCHBOX_MIN_AGE };
    })
    .filter((c) => c.age === null || c.age < 18);
}

/** Dinners from the meal plan (with ingredients, so they can be checked), so yesterday's dinner can become today's lunchbox. */
export function dinnersFromPlan(
  plan: { days: { date: string; meals: { type: string; name: string; ingredients?: { name: string }[] }[] }[] } | null | undefined,
): { date: string; name: string; ingredients: string[] }[] {
  if (!plan) return [];
  return plan.days.flatMap((d) =>
    d.meals
      .filter((m) => m.type === 'dinner' && m.name)
      .map((m) => ({ date: d.date, name: m.name, ingredients: (m.ingredients ?? []).map((i) => i.name).filter(Boolean) })),
  );
}

/** The idea's text in the family's language (English when no translation yet). */
export function ideaText(idea: LunchboxIdea, lang: LunchboxLang): LunchboxText {
  const t = lang === 'en' ? undefined : idea.i18n?.[lang];
  return {
    name: t?.name || idea.name,
    items: t?.items?.length === idea.items.length ? t.items : idea.items,
    fun_tip: t?.fun_tip || idea.fun_tip,
    tools: idea.tools,
  };
}

export interface OptionView extends LunchboxText {
  key: string;
  image: string | null;
  leftover: boolean;
  /** English tool names, for Amazon searches. */
  toolQueries: string[];
}

/** Everything a screen needs to show one option. */
export function optionView(option: LunchboxOption, ideas: LunchboxIdea[], lang: LunchboxLang): OptionView | null {
  if (option.kind === 'leftover') {
    // Shown in the family's language (the dinner name is translated when it is a library recipe).
    const dinner = tr(option.dinner);
    return {
      name: tr('Leftover {0}', [dinner]),
      items: [
        tr('{0} from last night (cold or at room temperature)', [dinner]),
        tr('a wrap, rice or bread'),
        tr('cucumber or carrot sticks'),
        tr('a piece of fruit'),
      ],
      fun_tip: tr("Turn last night's dinner into a new lunch: roll it in a wrap and cut it into pinwheels."),
      tools: option.tools.map((t) => tr(t)),
      key: `left-${option.dinner}`,
      image: null,
      leftover: true,
      toolQueries: option.tools,
    };
  }
  const idea = ideas.find((i) => i.id === option.id);
  if (!idea) return null;
  const text = ideaText(idea, lang);
  const toolNames = lang === 'en' ? idea.tools : idea.i18n?.[lang]?.tools?.length === idea.tools.length ? idea.i18n[lang]!.tools! : idea.tools;
  return { ...text, tools: toolNames, key: idea.id, image: idea.image_path, leftover: false, toolQueries: idea.tools };
}

/** Amazon links for a lunchbox's tools in the family's own store (Firdam's tag only where it has one). */
export function toolLinks(view: OptionView, currency: string | null | undefined): { label: string; url: string; affiliate: boolean }[] {
  return view.toolQueries.map((q, i) => ({ label: view.tools[i] ?? q, ...amazonToolUrl(q, currency) }));
}

export const LUNCHBOX_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Picks one option for a day, keeping the rest. */
export function chooseOption(plan: LunchboxPlan, date: string, index: number | null): LunchboxPlan {
  return { ...plan, days: plan.days.map((d) => (d.date === date ? { ...d, chosen: index } : d)) };
}

/** A friendly line for the week: how many days the child has picked. */
export function pickedCount(plan: LunchboxPlan): number {
  return plan.days.filter((d) => d.chosen !== null).length;
}
