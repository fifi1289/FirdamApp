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

/** Every currency in use today (ISO 4217), with its English name. */
export const CURRENCY_LIST: { code: string; name: string }[] = [
  { code: 'AED', name: 'UAE dirham' }, { code: 'AFN', name: 'Afghan afghani' }, { code: 'ALL', name: 'Albanian lek' },
  { code: 'AMD', name: 'Armenian dram' }, { code: 'AOA', name: 'Angolan kwanza' }, { code: 'ARS', name: 'Argentine peso' },
  { code: 'AUD', name: 'Australian dollar' }, { code: 'AWG', name: 'Aruban florin' }, { code: 'AZN', name: 'Azerbaijani manat' },
  { code: 'BAM', name: 'Bosnia-Herzegovina mark' }, { code: 'BBD', name: 'Barbadian dollar' }, { code: 'BDT', name: 'Bangladeshi taka' },
  { code: 'BHD', name: 'Bahraini dinar' }, { code: 'BIF', name: 'Burundian franc' }, { code: 'BMD', name: 'Bermudian dollar' },
  { code: 'BND', name: 'Brunei dollar' }, { code: 'BOB', name: 'Bolivian boliviano' }, { code: 'BRL', name: 'Brazilian real' },
  { code: 'BSD', name: 'Bahamian dollar' }, { code: 'BTN', name: 'Bhutanese ngultrum' }, { code: 'BWP', name: 'Botswana pula' },
  { code: 'BYN', name: 'Belarusian ruble' }, { code: 'BZD', name: 'Belize dollar' }, { code: 'CAD', name: 'Canadian dollar' },
  { code: 'CDF', name: 'Congolese franc' }, { code: 'CHF', name: 'Swiss franc' }, { code: 'CLP', name: 'Chilean peso' },
  { code: 'CNY', name: 'Chinese yuan' }, { code: 'COP', name: 'Colombian peso' }, { code: 'CRC', name: 'Costa Rican colón' },
  { code: 'CUP', name: 'Cuban peso' }, { code: 'CVE', name: 'Cape Verdean escudo' }, { code: 'CZK', name: 'Czech koruna' },
  { code: 'DJF', name: 'Djiboutian franc' }, { code: 'DKK', name: 'Danish krone' }, { code: 'DOP', name: 'Dominican peso' },
  { code: 'DZD', name: 'Algerian dinar' }, { code: 'EGP', name: 'Egyptian pound' }, { code: 'ERN', name: 'Eritrean nakfa' },
  { code: 'ETB', name: 'Ethiopian birr' }, { code: 'EUR', name: 'Euro' }, { code: 'FJD', name: 'Fijian dollar' },
  { code: 'FKP', name: 'Falkland Islands pound' }, { code: 'GBP', name: 'British pound' }, { code: 'GEL', name: 'Georgian lari' },
  { code: 'GHS', name: 'Ghanaian cedi' }, { code: 'GIP', name: 'Gibraltar pound' }, { code: 'GMD', name: 'Gambian dalasi' },
  { code: 'GNF', name: 'Guinean franc' }, { code: 'GTQ', name: 'Guatemalan quetzal' }, { code: 'GYD', name: 'Guyanese dollar' },
  { code: 'HKD', name: 'Hong Kong dollar' }, { code: 'HNL', name: 'Honduran lempira' }, { code: 'HTG', name: 'Haitian gourde' },
  { code: 'HUF', name: 'Hungarian forint' }, { code: 'IDR', name: 'Indonesian rupiah' }, { code: 'ILS', name: 'Israeli shekel' },
  { code: 'INR', name: 'Indian rupee' }, { code: 'IQD', name: 'Iraqi dinar' }, { code: 'IRR', name: 'Iranian rial' },
  { code: 'ISK', name: 'Icelandic króna' }, { code: 'JMD', name: 'Jamaican dollar' }, { code: 'JOD', name: 'Jordanian dinar' },
  { code: 'JPY', name: 'Japanese yen' }, { code: 'KES', name: 'Kenyan shilling' }, { code: 'KGS', name: 'Kyrgyzstani som' },
  { code: 'KHR', name: 'Cambodian riel' }, { code: 'KMF', name: 'Comorian franc' }, { code: 'KPW', name: 'North Korean won' },
  { code: 'KRW', name: 'South Korean won' }, { code: 'KWD', name: 'Kuwaiti dinar' }, { code: 'KYD', name: 'Cayman Islands dollar' },
  { code: 'KZT', name: 'Kazakhstani tenge' }, { code: 'LAK', name: 'Lao kip' }, { code: 'LBP', name: 'Lebanese pound' },
  { code: 'LKR', name: 'Sri Lankan rupee' }, { code: 'LRD', name: 'Liberian dollar' }, { code: 'LSL', name: 'Lesotho loti' },
  { code: 'LYD', name: 'Libyan dinar' }, { code: 'MAD', name: 'Moroccan dirham' }, { code: 'MDL', name: 'Moldovan leu' },
  { code: 'MGA', name: 'Malagasy ariary' }, { code: 'MKD', name: 'Macedonian denar' }, { code: 'MMK', name: 'Myanmar kyat' },
  { code: 'MNT', name: 'Mongolian tögrög' }, { code: 'MOP', name: 'Macanese pataca' }, { code: 'MRU', name: 'Mauritanian ouguiya' },
  { code: 'MUR', name: 'Mauritian rupee' }, { code: 'MVR', name: 'Maldivian rufiyaa' }, { code: 'MWK', name: 'Malawian kwacha' },
  { code: 'MXN', name: 'Mexican peso' }, { code: 'MYR', name: 'Malaysian ringgit' }, { code: 'MZN', name: 'Mozambican metical' },
  { code: 'NAD', name: 'Namibian dollar' }, { code: 'NGN', name: 'Nigerian naira' }, { code: 'NIO', name: 'Nicaraguan córdoba' },
  { code: 'NOK', name: 'Norwegian krone' }, { code: 'NPR', name: 'Nepalese rupee' }, { code: 'NZD', name: 'New Zealand dollar' },
  { code: 'OMR', name: 'Omani rial' }, { code: 'PAB', name: 'Panamanian balboa' }, { code: 'PEN', name: 'Peruvian sol' },
  { code: 'PGK', name: 'Papua New Guinean kina' }, { code: 'PHP', name: 'Philippine peso' }, { code: 'PKR', name: 'Pakistani rupee' },
  { code: 'PLN', name: 'Polish złoty' }, { code: 'PYG', name: 'Paraguayan guaraní' }, { code: 'QAR', name: 'Qatari riyal' },
  { code: 'RON', name: 'Romanian leu' }, { code: 'RSD', name: 'Serbian dinar' }, { code: 'RUB', name: 'Russian ruble' },
  { code: 'RWF', name: 'Rwandan franc' }, { code: 'SAR', name: 'Saudi riyal' }, { code: 'SBD', name: 'Solomon Islands dollar' },
  { code: 'SCR', name: 'Seychellois rupee' }, { code: 'SDG', name: 'Sudanese pound' }, { code: 'SEK', name: 'Swedish krona' },
  { code: 'SGD', name: 'Singapore dollar' }, { code: 'SHP', name: 'Saint Helena pound' }, { code: 'SLE', name: 'Sierra Leonean leone' },
  { code: 'SOS', name: 'Somali shilling' }, { code: 'SRD', name: 'Surinamese dollar' }, { code: 'SSP', name: 'South Sudanese pound' },
  { code: 'STN', name: 'São Tomé and Príncipe dobra' }, { code: 'SYP', name: 'Syrian pound' }, { code: 'SZL', name: 'Eswatini lilangeni' },
  { code: 'THB', name: 'Thai baht' }, { code: 'TJS', name: 'Tajikistani somoni' }, { code: 'TMT', name: 'Turkmenistani manat' },
  { code: 'TND', name: 'Tunisian dinar' }, { code: 'TOP', name: 'Tongan paʻanga' }, { code: 'TRY', name: 'Turkish lira' },
  { code: 'TTD', name: 'Trinidad and Tobago dollar' }, { code: 'TWD', name: 'New Taiwan dollar' }, { code: 'TZS', name: 'Tanzanian shilling' },
  { code: 'UAH', name: 'Ukrainian hryvnia' }, { code: 'UGX', name: 'Ugandan shilling' }, { code: 'USD', name: 'US dollar' },
  { code: 'UYU', name: 'Uruguayan peso' }, { code: 'UZS', name: 'Uzbekistani som' }, { code: 'VES', name: 'Venezuelan bolívar' },
  { code: 'VND', name: 'Vietnamese đồng' }, { code: 'VUV', name: 'Vanuatu vatu' }, { code: 'WST', name: 'Samoan tālā' },
  { code: 'XAF', name: 'Central African CFA franc' }, { code: 'XCD', name: 'East Caribbean dollar' }, { code: 'XCG', name: 'Caribbean guilder' },
  { code: 'XOF', name: 'West African CFA franc' }, { code: 'XPF', name: 'CFP franc' }, { code: 'YER', name: 'Yemeni rial' },
  { code: 'ZAR', name: 'South African rand' }, { code: 'ZMW', name: 'Zambian kwacha' }, { code: 'ZWG', name: 'Zimbabwe gold' },
];

/** Shown first in the currency pickers: where most Firdam families live. */
export const COMMON_CURRENCIES = [
  'CAD', 'USD', 'GBP', 'EUR', 'AUD', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'EGP', 'MAD', 'DZD',
  'TND', 'TRY', 'PKR', 'INR', 'BDT', 'IDR', 'MYR', 'NGN', 'ZAR',
];

/** All currency codes, A–Z. */
export const CURRENCIES = CURRENCY_LIST.map((c) => c.code);

export function currencyName(code: string): string {
  return CURRENCY_LIST.find((c) => c.code === code)?.name ?? code;
}

/** Currencies matching a search ("dirham", "mad", "pound"), common ones first. */
export function searchCurrencies(query: string): { code: string; name: string }[] {
  const q = query.trim().toLowerCase();
  const hits = q ? CURRENCY_LIST.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) : CURRENCY_LIST;
  const rank = (code: string) => {
    const i = COMMON_CURRENCIES.indexOf(code);
    return i === -1 ? COMMON_CURRENCIES.length : i;
  };
  return [...hits].sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code));
}

/** The usual currency for a country (two-letter region code), used to guess a family's currency. */
export const REGION_CURRENCY: Record<string, string> = {
  CA: 'CAD', US: 'USD', GB: 'GBP', AU: 'AUD', NZ: 'NZD', IE: 'EUR', FR: 'EUR', DE: 'EUR', NL: 'EUR', BE: 'EUR', ES: 'EUR',
  IT: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', CY: 'EUR', MT: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
  LV: 'EUR', LT: 'EUR', HR: 'EUR', BG: 'EUR', XK: 'EUR', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
  HU: 'HUF', RO: 'RON', BA: 'BAM', AL: 'ALL', MK: 'MKD', RS: 'RSD', RU: 'RUB', UA: 'UAH',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', JO: 'JOD', LB: 'LBP', IQ: 'IQD', SY: 'SYP', YE: 'YER',
  PS: 'ILS', IL: 'ILS', IR: 'IRR', TR: 'TRY', AZ: 'AZN',
  EG: 'EGP', MA: 'MAD', DZ: 'DZD', TN: 'TND', LY: 'LYD', SD: 'SDG', MR: 'MRU', SO: 'SOS', DJ: 'DJF', KM: 'KMF', ET: 'ETB',
  KE: 'KES', TZ: 'TZS', UG: 'UGX', NG: 'NGN', GH: 'GHS', GM: 'GMD', GN: 'GNF', SL: 'SLE', SN: 'XOF', ML: 'XOF', NE: 'XOF',
  BF: 'XOF', CI: 'XOF', CM: 'XAF', TD: 'XAF', ZA: 'ZAR',
  PK: 'PKR', IN: 'INR', BD: 'BDT', AF: 'AFN', LK: 'LKR', NP: 'NPR', MV: 'MVR', KZ: 'KZT', UZ: 'UZS', KG: 'KGS', TJ: 'TJS',
  TM: 'TMT', MY: 'MYR', ID: 'IDR', SG: 'SGD', BN: 'BND', PH: 'PHP', TH: 'THB', CN: 'CNY', HK: 'HKD', JP: 'JPY', KR: 'KRW',
  BR: 'BRL', MX: 'MXN', AR: 'ARS',
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
