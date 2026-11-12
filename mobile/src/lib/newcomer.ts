import { useCallback, useEffect, useState } from 'react';

import { ageFromBirthDate } from '@/shared/lunchbox-core';
import type { NewcomerPlan, NewcomerStatus, NewcomerStepRow } from '@/shared/newcomer-core';
import { supabase } from './supabase';

/** A person in the family who can be given a step (people with a Firdam account). */
export interface NewcomerPerson {
  id: string;
  name: string;
  me: boolean;
}

export interface NewcomerState {
  plan: NewcomerPlan | null;
  rows: NewcomerStepRow[];
  people: NewcomerPerson[];
  hasKids: boolean;
}

const PLAN_COLUMNS = 'id, country, region, city, status, arrival_date';
const STEP_COLUMNS = 'id, plan_id, step_key, assignee, done_at, done_by, note';

async function load(): Promise<NewcomerState> {
  const { data: session } = await supabase.auth.getSession();
  const me = session.session?.user;
  const [{ data: plans }, { data: members }, { data: family }] = await Promise.all([
    supabase.from('newcomer_plans').select(PLAN_COLUMNS).order('created_at').limit(1),
    supabase.from('household_members').select('user_id, display_name').order('joined_at'),
    supabase.from('family_members').select('relationship, birth_date'),
  ]);
  const plan = ((plans ?? [])[0] as NewcomerPlan | undefined) ?? null;
  const { data: rows } = plan ? await supabase.from('newcomer_steps').select(STEP_COLUMNS).eq('plan_id', plan.id) : { data: [] };
  const people: NewcomerPerson[] = (members ?? []).map((m: { user_id: string; display_name: string | null }) => ({
    id: m.user_id,
    name: (m.display_name ?? '').split(' ')[0] || 'Family',
    me: m.user_id === me?.id,
  }));
  if (me && !people.some((p) => p.me)) people.unshift({ id: me.id, name: 'You', me: true });
  const hasKids = (family ?? []).some(
    (f: { relationship: string; birth_date: string | null }) =>
      (f.relationship === 'Son' || f.relationship === 'Daughter') && (ageFromBirthDate(f.birth_date) ?? 0) < 18,
  );
  return { plan, rows: (rows ?? []) as NewcomerStepRow[], people, hasKids };
}

/** The family's plan, their progress and the people steps can be given to. */
export function useNewcomer() {
  const [state, setState] = useState<NewcomerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setState(await load());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { state, error, refresh, setState };
}

export async function savePlan(
  plan: Partial<NewcomerPlan> & { status: NewcomerStatus; country: string },
  id?: string,
): Promise<NewcomerPlan> {
  const body = {
    country: plan.country,
    region: plan.region ?? null,
    city: plan.city?.trim() || null,
    status: plan.status,
    arrival_date: plan.arrival_date ?? null,
    updated_at: new Date().toISOString(),
  };
  const q = id
    ? supabase.from('newcomer_plans').update(body).eq('id', id)
    : supabase.from('newcomer_plans').insert(body);
  const { data, error } = await q.select(PLAN_COLUMNS).single();
  if (error) throw error;
  return data as NewcomerPlan;
}

/** Assigns, finishes or re-opens one step (one row per step and plan). */
export async function saveStep(
  planId: string,
  key: string,
  patch: Partial<Pick<NewcomerStepRow, 'assignee' | 'done_at' | 'done_by' | 'note'>>,
): Promise<NewcomerStepRow> {
  const { data, error } = await supabase
    .from('newcomer_steps')
    .upsert({ plan_id: planId, step_key: key, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'plan_id,step_key' })
    .select(STEP_COLUMNS)
    .single();
  if (error) throw error;
  return data as NewcomerStepRow;
}
