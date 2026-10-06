import type { LifeModule, ModuleGroup, ModuleIconName } from '@/types';
import {
  Archive,
  BookOpen,
  CalendarHeart,
  ListChecks,
  MapPin,
  Moon,
  MoonStar,
  ShoppingCart,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export const moduleIconMap: Record<ModuleIconName, LucideIcon> = {
  moon: Moon,
  'moon-star': MoonStar,
  users: Users,
  wallet: Wallet,
  'map-pin': MapPin,
  'shopping-cart': ShoppingCart,
  'book-open': BookOpen,
  archive: Archive,
  utensils: Utensils,
  'calendar-heart': CalendarHeart,
  'list-checks': ListChecks,
};

export const MODULE_GROUPS: ModuleGroup[] = ['Halal living', 'Faith', 'Family', 'Money'];

export const lifeModules: LifeModule[] = [
  {
    id: 'halal-places',
    name: 'Halal Places',
    description:
      'Find halal grocers, butchers, restaurants and mosques near you — anywhere in the world.',
    status: 'active',
    accent: 'from-brand-dark to-brand-light',
    icon: 'map-pin',
    href: '/dashboard/halal-places',
    group: 'Halal living',
  },
  {
    id: 'meals',
    name: 'Meal Planner',
    description: 'Plan wholesome halal meals for the whole family, built around your pantry.',
    status: 'active',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'utensils',
    href: '/dashboard/meals',
    group: 'Halal living',
  },
  {
    id: 'groceries',
    name: 'Groceries',
    description:
      'Shared grocery lists filled straight from your meal plan, minus what you already have.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'shopping-cart',
    href: '/dashboard/groceries',
    group: 'Halal living',
  },
  {
    id: 'pantry',
    name: 'Pantry',
    description: 'Track what is in your kitchen, spot what is expiring, and reduce waste.',
    status: 'active',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'archive',
    href: '/dashboard/pantry',
    group: 'Halal living',
  },
  {
    id: 'prayer-times',
    name: 'Prayer Times',
    description: 'Accurate daily prayer times, the Qibla direction, and a monthly timetable.',
    status: 'active',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'moon',
    href: '/dashboard/prayer-times',
    group: 'Faith',
  },
  {
    id: 'ramadan',
    name: 'Ramadan',
    description: 'Suhoor and iftar times, a fasting tracker, and your Quran goal for the month.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'moon-star',
    href: '/dashboard/ramadan',
    group: 'Faith',
  },
  {
    id: 'quran',
    name: 'Quran & Duas',
    description: 'Daily duas for every moment and a gentle tracker for your Quran reading.',
    status: 'active',
    accent: 'from-brand-dark to-brand-light',
    icon: 'book-open',
    href: '/dashboard/quran',
    group: 'Faith',
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Secure profiles for everyone in your household.',
    status: 'active',
    accent: 'from-brand-dark to-brand-light',
    icon: 'users',
    href: '/dashboard/family',
    group: 'Family',
  },
  {
    id: 'calendar',
    name: 'Family Calendar',
    description: 'Eid, Aqiqah, Nikah, birthdays and school events — one shared calendar.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'calendar-heart',
    href: '/dashboard/calendar',
    group: 'Family',
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'Household tasks and personal goals, organised around your day.',
    status: 'active',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'list-checks',
    href: '/dashboard/planner',
    group: 'Family',
  },
  {
    id: 'budget',
    name: 'Budget',
    description: 'Monthly budget, expenses, savings goals, sadaqah and a zakat calculator.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'wallet',
    href: '/dashboard/budget',
    group: 'Money',
  },
];

export function getModuleById(id: string) {
  return lifeModules.find((m) => m.id === id);
}

export const activeModules = lifeModules.filter((m) => m.status === 'active');
export const betaModules = lifeModules.filter((m) => m.status === 'beta');
