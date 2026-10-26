import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import { deviceTimeZone, isCanadianTimeZone } from '@/shared/shop-links';
import { DEFAULT_CATEGORIES, EMPTY_ZAKAT, REGION_CURRENCY, monthBounds, type SavingsGoalKind, type TransactionType, type ZakatValues } from '@/shared/finance-core';

/** Same tables as the website's Finance page, so entries show up in both. */
export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  monthly_limit: number | null;
  position: number;
}

export interface BudgetTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  description: string | null;
  occurred_on: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  kind: SavingsGoalKind;
  target: number;
  saved: number;
  target_date: string | null;
}

let seeding: Promise<BudgetCategory[]> | null = null;

/** The family's categories; the default list is created the first time. */
export async function loadCategories(): Promise<BudgetCategory[]> {
  const { data, error } = await supabase.from('budget_categories').select('*').order('position', { ascending: true });
  if (error) throw error;
  if (data && data.length) return data as BudgetCategory[];
  seeding ??= Promise.resolve(
    supabase
      .from('budget_categories')
      .insert(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, position: i })))
      .select(),
  ).then(({ data: created }) => (created ?? []) as BudgetCategory[]);
  const created = await seeding;
  seeding = null;
  return created;
}

/** Adds a category (no id) or renames it / changes its limit. */
export async function saveCategory(values: { name: string; monthly_limit: number | null }, id?: string, position = 0): Promise<void> {
  const { error } = id
    ? await supabase.from('budget_categories').update(values).eq('id', id)
    : await supabase.from('budget_categories').insert({ ...values, icon: 'wallet', position });
  if (error) throw error;
}

/** Removes a category; its entries stay, without a category. */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('budget_categories').delete().eq('id', id);
  if (error) throw error;
}

export async function setCategoryLimit(id: string, limit: number | null): Promise<void> {
  const { error } = await supabase.from('budget_categories').update({ monthly_limit: limit }).eq('id', id);
  if (error) throw error;
}

export async function loadMonth(year: number, month: number): Promise<BudgetTransaction[]> {
  const { start, end } = monthBounds(year, month);
  const { data, error } = await supabase
    .from('budget_transactions')
    .select('*')
    .gte('occurred_on', start)
    .lte('occurred_on', end)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BudgetTransaction[];
}

export async function saveTransaction(
  entry: { type: TransactionType; amount: number; category_id: string | null; description: string | null; occurred_on: string },
  id?: string,
): Promise<void> {
  const { error } = id
    ? await supabase.from('budget_transactions').update(entry).eq('id', id)
    : await supabase.from('budget_transactions').insert(entry);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('budget_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function loadGoals(): Promise<SavingsGoal[]> {
  const { data, error } = await supabase.from('savings_goals').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SavingsGoal[];
}

export async function saveGoal(
  goal: { name: string; kind: SavingsGoalKind; target: number; saved?: number; target_date: string | null },
  id?: string,
): Promise<void> {
  const row = { ...goal, updated_at: new Date().toISOString() };
  const { error } = id ? await supabase.from('savings_goals').update(row).eq('id', id) : await supabase.from('savings_goals').insert(row);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('savings_goals').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Settings kept on this phone ----------

const CURRENCY_KEY = 'firdam.currency';
const ZAKAT_KEY = 'firdam.zakat.inputs';
const FITR_KEY = 'firdam.zakat.fitr';

function guessCurrency(): string {
  // In Canada phones are often set to "English (US)"; the time zone is more reliable.
  if (isCanadianTimeZone(deviceTimeZone())) return 'CAD';
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const region = locale.split(/[-_]/).find((p) => /^[A-Z]{2}$/.test(p));
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region]!;
  } catch {
    // ignore
  }
  return 'CAD';
}

export async function getCurrency(): Promise<string> {
  return (await AsyncStorage.getItem(CURRENCY_KEY).catch(() => null)) ?? guessCurrency();
}

export async function setCurrency(c: string): Promise<void> {
  await AsyncStorage.setItem(CURRENCY_KEY, c).catch(() => {});
}

/** Zakat amounts stay on this phone; only a payment you record is saved to your account. */
export async function getZakatInputs(): Promise<{ values: ZakatValues; basis: 'silver' | 'gold'; fitr: { people: string; perPerson: string } }> {
  const [raw, fitrRaw] = await Promise.all([AsyncStorage.getItem(ZAKAT_KEY).catch(() => null), AsyncStorage.getItem(FITR_KEY).catch(() => null)]);
  let values = EMPTY_ZAKAT;
  let basis: 'silver' | 'gold' = 'silver';
  let fitr = { people: '', perPerson: '' };
  try {
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ZakatValues> & { basis?: 'silver' | 'gold' };
      values = { ...EMPTY_ZAKAT, ...saved };
      if (saved.basis === 'gold') basis = 'gold';
    }
    if (fitrRaw) fitr = { ...fitr, ...(JSON.parse(fitrRaw) as Partial<typeof fitr>) };
  } catch {
    // ignore
  }
  return { values, basis, fitr };
}

export async function saveZakatInputs(values: ZakatValues, basis: 'silver' | 'gold'): Promise<void> {
  await AsyncStorage.setItem(ZAKAT_KEY, JSON.stringify({ ...values, basis })).catch(() => {});
}

export async function saveFitrInputs(fitr: { people: string; perPerson: string }): Promise<void> {
  await AsyncStorage.setItem(FITR_KEY, JSON.stringify(fitr)).catch(() => {});
}
