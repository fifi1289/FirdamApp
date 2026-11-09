import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { tr } from './i18n';
import { supabase } from './supabase';
import type { LunchboxChild, LunchboxDay, LunchboxIdea, LunchboxPlan } from '@/shared/lunchbox-core';

/** Sons and daughters from the family profile. */
export async function loadFamilyChildren(): Promise<{ first_name: string; relationship: string; birth_date: string | null }[]> {
  const { data } = await supabase.from('family_members').select('first_name, relationship, birth_date');
  return (data ?? []) as { first_name: string; relationship: string; birth_date: string | null }[];
}

async function loadIdeas(days: LunchboxDay[]): Promise<LunchboxIdea[]> {
  const ids = [...new Set(days.flatMap((d) => d.options.flatMap((o) => (o.kind === 'idea' ? [o.id] : []))))];
  if (!ids.length) return [];
  const { data } = await supabase.from('lunchbox_ideas').select('*').in('id', ids);
  return (data ?? []) as LunchboxIdea[];
}

/** The saved lunchbox plan for a week (and the ideas it uses), or null. */
export async function loadLunchboxPlan(weekStart: string): Promise<{ plan: LunchboxPlan; ideas: LunchboxIdea[] } | null> {
  const { data } = await supabase.from('lunchbox_plans').select('week_start, children, days').eq('week_start', weekStart).maybeSingle();
  if (!data) return null;
  const plan: LunchboxPlan = { weekStart: data.week_start as string, children: (data.children ?? []) as LunchboxChild[], days: (data.days ?? []) as LunchboxDay[] };
  return { plan, ideas: await loadIdeas(plan.days) };
}

/** Plans a new week of lunchboxes (3 options a day) on the server, which checks every lunchbox. */
export async function makeLunchboxPlan(input: {
  weekStart: string;
  children: LunchboxChild[];
  allergies: string[];
  leftovers: { date: string; name: string; ingredients: string[] }[];
}): Promise<{ plan: LunchboxPlan; ideas: LunchboxIdea[]; aiNote: string | null }> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error(tr('Please sign in again.'));
  const res = await fetch(`${SUPABASE_URL}/functions/v1/lunchbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ action: 'plan', ...input }),
  });
  const json = (await res.json().catch(() => null)) as
    | { weekStart?: string; children?: LunchboxChild[]; days?: LunchboxDay[]; ideas?: LunchboxIdea[]; aiNote?: string | null; error?: string }
    | null;
  if (!res.ok || !json?.days) throw new Error(tr(json?.error ?? 'Lunchboxes could not be planned just now. Please try again.'));
  return {
    plan: { weekStart: json.weekStart ?? input.weekStart, children: json.children ?? input.children, days: json.days },
    ideas: json.ideas ?? [],
    aiNote: json.aiNote ?? null,
  };
}

/** Saves which lunchbox the child picked each day. */
export async function saveLunchboxChoices(plan: LunchboxPlan): Promise<void> {
  await supabase.from('lunchbox_plans').update({ days: plan.days, updated_at: new Date().toISOString() }).eq('week_start', plan.weekStart);
}
