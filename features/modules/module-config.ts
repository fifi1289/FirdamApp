import type { LifeModule, ModuleGroup, ModuleIconName } from '@/types';
import {
  Archive,
  BookOpen,
  ChefHat,
  GraduationCap,
  Handshake,
  HeartPulse,
  Plane,
  Store,
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
  'chef-hat': ChefHat,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  handshake: Handshake,
  plane: Plane,
  store: Store,
};

export const MODULE_GROUPS: ModuleGroup[] = ['Halal living', 'Faith', 'Family', 'Community & travel', 'Money'];

/** Every module Firdam has, including ones hidden for the launch. */
export const allModules: LifeModule[] = [
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
    id: 'recipes',
    name: 'Recipes',
    description: 'Halal recipes from around the Muslim world — browse, save, scale and cook.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'chef-hat',
    href: '/dashboard/recipes',
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
    id: 'shopping',
    name: 'Shopping',
    description:
      'Smart shopping lists filled straight from your meal plan, minus what you already have.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'shopping-cart',
    href: '/dashboard/shopping',
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
    id: 'learning',
    name: 'Learning',
    description:
      'Learning goals for every family member, a kids’ corner, and trusted tutors and schools.',
    status: 'planned',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'graduation-cap',
    href: '/dashboard/learning',
    group: 'Family',
  },
  {
    id: 'health',
    name: 'Health',
    description: 'Healthy and sunnah habits, plus appointments, vaccinations and allergies.',
    status: 'planned',
    accent: 'from-brand-mid to-brand-light',
    icon: 'heart-pulse',
    href: '/dashboard/health',
    group: 'Family',
  },
  {
    id: 'community',
    name: 'Community',
    description: 'Halaqas, iftars, Eid prayers and fundraisers happening near you.',
    status: 'active',
    accent: 'from-brand-dark to-brand-light',
    icon: 'handshake',
    href: '/dashboard/community',
    group: 'Community & travel',
  },
  {
    id: 'travel',
    name: 'Travel',
    description: 'Plan halal-friendly trips, Umrah and Hajj, and find trusted travel agencies.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'plane',
    href: '/dashboard/travel',
    group: 'Community & travel',
  },
  {
    id: 'directory',
    name: 'Directory',
    description: 'Trusted Muslim businesses — Umrah operators, tutors, caterers, Islamic finance.',
    status: 'active',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'store',
    href: '/dashboard/directory',
    group: 'Community & travel',
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Monthly budget, expenses, savings goals, sadaqah and a zakat calculator.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'wallet',
    href: '/dashboard/finance',
    group: 'Money',
  },
];

/**
 * Hidden until after launch: unfinished, or only useful once many families use
 * Firdam. Their pages still exist; they are just not shown in menus or lists.
 * Remove an id here to bring a module back.
 */
export const HIDDEN_MODULE_IDS = new Set(['planner', 'learning', 'health', 'community', 'travel', 'directory']);

/** The modules shown in menus, the home page and the landing page. */
export const lifeModules: LifeModule[] = allModules.filter((m) => !HIDDEN_MODULE_IDS.has(m.id));

/** Groups that still have a visible module. */
export const VISIBLE_MODULE_GROUPS: ModuleGroup[] = MODULE_GROUPS.filter((g) => lifeModules.some((m) => m.group === g));

export function getModuleById(id: string) {
  return allModules.find((m) => m.id === id);
}

export const activeModules = lifeModules.filter((m) => m.status === 'active');
export const betaModules = lifeModules.filter((m) => m.status === 'beta');
