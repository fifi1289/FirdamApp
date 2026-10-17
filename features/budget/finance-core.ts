/**
 * Finance & zakat rules shared by the website and the phone app (the app gets
 * a copy via mobile/scripts/sync-shared.mjs). Plain TypeScript: no React, no
 * browser APIs.
 */

export type TransactionType = 'income' | 'expense' | 'sadaqah' | 'zakat';
export type SavingsGoalKind = 'general' | 'hajj' | 'umrah' | 'eid' | 'education' | 'emergency' | 'home' | 'wedding';

export const DEFAULT_CATEGORIES: { name: string; icon: string }[] = [
  { name: 'Groceries', icon: 'groceries' },
  { name: 'Housing', icon: 'home' },
  { name: 'Utilities', icon: 'utilities' },
  { name: 'Transport', icon: 'transport' },
  { name: 'Children & school', icon: 'children' },
  { name: 'Health', icon: 'health' },
  { name: 'Clothing', icon: 'clothing' },
  { name: 'Eating out', icon: 'dining' },
  { name: 'Family & gifts', icon: 'gifts' },
  { name: 'Subscriptions', icon: 'subscriptions' },
  { name: 'Other', icon: 'wallet' },
];

export const TRANSACTION_TYPES: { value: TransactionType; label: string; hint: string }[] = [
  { value: 'expense', label: 'Expense', hint: 'Money spent' },
  { value: 'income', label: 'Income', hint: 'Salary, business, gifts received' },
  { value: 'sadaqah', label: 'Sadaqah', hint: 'Voluntary charity' },
  { value: 'zakat', label: 'Zakat', hint: 'Zakat al-mal or zakat al-fitr' },
];

export const GOAL_KINDS: { value: SavingsGoalKind; label: string; emoji: string }[] = [
  { value: 'hajj', label: 'Hajj', emoji: '🕋' },
  { value: 'umrah', label: 'Umrah', emoji: '🕌' },
  { value: 'eid', label: 'Eid', emoji: '🌙' },
  { value: 'education', label: 'Education', emoji: '🎓' },
  { value: 'emergency', label: 'Emergency fund', emoji: '🛟' },
  { value: 'home', label: 'Home', emoji: '🏡' },
  { value: 'wedding', label: 'Wedding / Nikah', emoji: '💍' },
  { value: 'general', label: 'Other goal', emoji: '✨' },
];

export const CURRENCIES = [
  'CAD', 'USD', 'GBP', 'EUR', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'MYR',
  'IDR', 'SGD', 'AUD', 'TRY', 'EGP', 'MAD', 'PKR', 'INR', 'BDT', 'NGN', 'ZAR',
] as const;

export const REGION_CURRENCY: Record<string, string> = {
  CA: 'CAD', US: 'USD', GB: 'GBP', AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  MY: 'MYR', ID: 'IDR', SG: 'SGD', AU: 'AUD', TR: 'TRY', EG: 'EGP', MA: 'MAD', PK: 'PKR', IN: 'INR',
  BD: 'BDT', NG: 'NGN', ZA: 'ZAR', FR: 'EUR', DE: 'EUR', NL: 'EUR', BE: 'EUR', ES: 'EUR', IT: 'EUR',
  IE: 'EUR', AT: 'EUR',
};

export function formatMoney(amount: number, currency: string, opts?: { compact?: boolean }): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: opts?.compact || Math.abs(amount) >= 1000 ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const last = new Date(year, month, 0).getDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(last)}` };
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parses a typed amount ("1,250.50") — 0 for anything that isn't a positive number. */
export function parseAmount(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export interface MonthTotals {
  income: number;
  expense: number;
  /** Sadaqah + zakat. */
  giving: number;
  byCategory: Map<string, number>;
  plannedLimit: number;
  balance: number;
  /** Left of the category limits, or null when no limits are set. */
  budgetLeft: number | null;
}

export function monthTotals(
  transactions: { type: TransactionType; amount: number | string; category_id: string | null }[],
  categories: { monthly_limit: number | string | null }[],
): MonthTotals {
  let income = 0;
  let expense = 0;
  let giving = 0;
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    const a = Number(t.amount);
    if (t.type === 'income') income += a;
    else if (t.type === 'expense') {
      expense += a;
      const key = t.category_id ?? 'none';
      byCategory.set(key, (byCategory.get(key) ?? 0) + a);
    } else giving += a;
  }
  const plannedLimit = categories.reduce((s, c) => s + (c.monthly_limit ? Number(c.monthly_limit) : 0), 0);
  return {
    income,
    expense,
    giving,
    byCategory,
    plannedLimit,
    balance: income - expense - giving,
    budgetLeft: plannedLimit > 0 ? plannedLimit - expense : null,
  };
}

// ---------- Zakat al-mal ----------

export const GOLD_NISAB_GRAMS = 85;
export const SILVER_NISAB_GRAMS = 595;
export const ZAKAT_RATE = 0.025;

export type ZakatField =
  | 'cash' | 'bank' | 'goldValue' | 'silverValue' | 'investments' | 'business' | 'receivables'
  | 'debts' | 'goldPrice' | 'silverPrice';

export const ZAKAT_ASSETS: { key: ZakatField; label: string; hint?: string }[] = [
  { key: 'cash', label: 'Cash at home' },
  { key: 'bank', label: 'Bank accounts', hint: 'Current and savings balances' },
  { key: 'goldValue', label: 'Gold you own', hint: 'Current market value' },
  { key: 'silverValue', label: 'Silver you own', hint: 'Current market value' },
  { key: 'investments', label: 'Shares & investments', hint: 'Zakatable portion' },
  { key: 'business', label: 'Business stock & cash' },
  { key: 'receivables', label: 'Money owed to you', hint: 'That you expect to receive' },
];

export type ZakatValues = Record<ZakatField, string>;

export const EMPTY_ZAKAT: ZakatValues = {
  cash: '', bank: '', goldValue: '', silverValue: '', investments: '', business: '', receivables: '',
  debts: '', goldPrice: '', silverPrice: '',
};

export function computeZakatAlMal(values: ZakatValues, basis: 'silver' | 'gold') {
  const assets = ZAKAT_ASSETS.reduce((sum, a) => sum + parseAmount(values[a.key]), 0);
  const net = Math.max(0, assets - parseAmount(values.debts));
  const goldNisab = parseAmount(values.goldPrice) * GOLD_NISAB_GRAMS;
  const silverNisab = parseAmount(values.silverPrice) * SILVER_NISAB_GRAMS;
  const nisab = basis === 'gold' ? goldNisab : silverNisab;
  const hasNisab = nisab > 0;
  const due = hasNisab && net >= nisab ? net * ZAKAT_RATE : 0;
  return { assets, net, nisab, hasNisab, due, goldNisab, silverNisab };
}

// ---------- Zakat al-fitr ----------

/**
 * Zakat al-fitr: one sa' (about 2.5–3 kg) of staple food, or its value, for
 * each person you provide for, paid before the Eid al-Fitr prayer. The amount
 * per person is set locally (mosques and zakat councils announce it each
 * year), so the family enters it; Firdam never guesses it.
 */
export function computeZakatAlFitr(people: number, perPerson: string | number) {
  const count = Math.max(0, Math.floor(Number(people) || 0));
  const each = parseAmount(perPerson);
  return { people: count, perPerson: each, total: count * each };
}

export const ZAKAT_AL_FITR_NOTE =
  'Due for each person you provide for — yourself, your spouse, children and anyone you support — and paid before the Eid al-Fitr prayer. Use the amount per person announced by your local mosque or zakat council.';

export const ZAKAT_DESCRIPTIONS = { mal: 'Zakat al-mal', fitr: 'Zakat al-fitr' } as const;
