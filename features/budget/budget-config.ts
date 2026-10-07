'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Baby,
  Bus,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Lightbulb,
  Plane,
  Repeat,
  Shirt,
  ShoppingBasket,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import type { SavingsGoalKind, TransactionType } from '@/types/database';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  groceries: ShoppingBasket,
  home: Home,
  utilities: Lightbulb,
  transport: Bus,
  children: Baby,
  education: GraduationCap,
  health: HeartPulse,
  clothing: Shirt,
  dining: Utensils,
  gifts: Gift,
  subscriptions: Repeat,
  travel: Plane,
  giving: HandHeart,
  wallet: Wallet,
};

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
  { value: 'zakat', label: 'Zakat', hint: 'Obligatory annual zakat' },
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
  'CAD',
  'USD',
  'GBP',
  'EUR',
  'AED',
  'SAR',
  'QAR',
  'KWD',
  'BHD',
  'OMR',
  'MYR',
  'IDR',
  'SGD',
  'AUD',
  'TRY',
  'EGP',
  'MAD',
  'PKR',
  'INR',
  'BDT',
  'NGN',
  'ZAR',
] as const;

const REGION_CURRENCY: Record<string, string> = {
  CA: 'CAD',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  MY: 'MYR',
  ID: 'IDR',
  SG: 'SGD',
  AU: 'AUD',
  TR: 'TRY',
  EG: 'EGP',
  MA: 'MAD',
  PK: 'PKR',
  IN: 'INR',
  BD: 'BDT',
  NG: 'NGN',
  ZA: 'ZAR',
  FR: 'EUR',
  DE: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  IE: 'EUR',
  AT: 'EUR',
};

const CURRENCY_KEY = 'firdam.currency';

function guessCurrency(): string {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region]!;
  } catch {
    // ignore
  }
  return 'CAD';
}

export function useCurrency() {
  const [currency, setCurrency] = useState('CAD');

  useEffect(() => {
    try {
      setCurrency(window.localStorage.getItem(CURRENCY_KEY) ?? guessCurrency());
    } catch {
      setCurrency(guessCurrency());
    }
  }, []);

  const update = useCallback((next: string) => {
    setCurrency(next);
    try {
      window.localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  return { currency, setCurrency: update };
}

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
