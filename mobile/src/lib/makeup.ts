import { supabase } from '@/lib/supabase';
import type { MakeupRecord } from '@/shared/makeup-core';

/** Your make-up fasts (qada), the same as Fasting on firdam.com. Private to you. */
export async function loadMakeup(): Promise<MakeupRecord[]> {
  const { data, error } = await supabase.from('fast_makeup').select('ramadan_year, missed, made_up').order('ramadan_year');
  if (error) return [];
  return (data ?? []) as MakeupRecord[];
}

export async function saveMakeup(r: MakeupRecord): Promise<void> {
  const { error } = await supabase
    .from('fast_makeup')
    .upsert({ ramadan_year: r.ramadan_year, missed: r.missed, made_up: r.made_up, updated_at: new Date().toISOString() }, { onConflict: 'user_id,ramadan_year' });
  if (error) throw error;
}
