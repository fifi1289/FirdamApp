import type { LifeModule, ModuleIconName } from '@/types';
import {
  Moon,
  Users,
  Wallet,
  Plane,
  ShoppingCart,
  HeartPulse,
  Handshake,
  BookOpen,
  Archive,
  type LucideIcon,
} from 'lucide-react';

export const moduleIconMap: Record<ModuleIconName, LucideIcon> = {
  moon: Moon,
  users: Users,
  wallet: Wallet,
  plane: Plane,
  'shopping-cart': ShoppingCart,
  'heart-pulse': HeartPulse,
  handshake: Handshake,
  'book-open': BookOpen,
  archive: Archive,
};

export const lifeModules: LifeModule[] = [
  {
    id: 'family',
    name: 'Family',
    description:
      'Manage family events, milestones, and shared calendars to keep everyone in sync.',
    status: 'active',
    accent: 'from-brand-dark to-brand-light',
    icon: 'users',
    href: '/dashboard/family',
  },
  {
    id: 'pantry',
    name: 'Pantry',
    description:
      'Track your household food inventory, manage quantities, and reduce waste.',
    status: 'beta',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'archive',
    href: '/dashboard/pantry',
  },
  {
    id: 'prayer-times',
    name: 'Prayer Times',
    description:
      'Track daily prayer schedules, set reminders, and stay consistent with your spiritual routine.',
    status: 'active',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'moon',
    href: '/dashboard/prayer-times',
  },
  {
    id: 'finance',
    name: 'Finance',
    description:
      'Budget, track expenses, and visualize your financial goals with clean insights.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'wallet',
    href: '/dashboard/finance',
  },
  {
    id: 'travel',
    name: 'Travel',
    description:
      'Plan trips, save itineraries, and keep your adventures organized in one place.',
    status: 'active',
    accent: 'from-brand-mid to-brand-light',
    icon: 'plane',
    href: '/dashboard/travel',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    description:
      'Build smart lists, compare prices, and never forget the essentials again.',
    status: 'active',
    accent: 'from-brand-light to-brand-mid',
    icon: 'shopping-cart',
    href: '/dashboard/shopping',
  },
  {
    id: 'health',
    name: 'Health',
    description:
      'Log workouts, monitor habits, and keep your wellbeing front of mind.',
    status: 'active',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'heart-pulse',
    href: '/dashboard/health',
  },
  {
    id: 'community',
    name: 'Community',
    description:
      'Connect with your community, share events, and stay engaged with what matters.',
    status: 'beta',
    accent: 'from-brand-mid to-brand-light',
    icon: 'handshake',
    href: '/dashboard/community',
  },
  {
    id: 'learning',
    name: 'Learning',
    description:
      'Set learning goals, track progress, and build knowledge one step at a time.',
    status: 'beta',
    accent: 'from-brand-dark to-brand-mid',
    icon: 'book-open',
    href: '/dashboard/learning',
  },
];

export function getModuleById(id: string) {
  return lifeModules.find((m) => m.id === id);
}

export const activeModules = lifeModules.filter((m) => m.status === 'active');
export const betaModules = lifeModules.filter((m) => m.status === 'beta');
