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

import { REGION_CURRENCY } from '@/features/budget/finance-core';
import { deviceTimeZone, isCanadianTimeZone } from '@/features/groceries/shop-links';

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

// Shared with the phone app.
export {
  COMMON_CURRENCIES,
  CURRENCIES,
  CURRENCY_LIST,
  currencyName,
  DEFAULT_CATEGORIES,
  GOAL_KINDS,
  TRANSACTION_TYPES,
  formatMoney,
  monthBounds,
  todayISO,
} from '@/features/budget/finance-core';

const CURRENCY_KEY = 'firdam.currency';

function guessCurrency(): string {
  // In Canada browsers often say "English (US)"; the time zone is more reliable.
  if (isCanadianTimeZone(deviceTimeZone())) return 'CAD';
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



