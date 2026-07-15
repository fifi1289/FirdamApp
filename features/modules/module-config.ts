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
};

export const lifeModules: LifeModule[] = [
  {
    id: 'prayer-times',
    name: 'Prayer Times',
    description:
      'Track daily prayer schedules, set reminders, and stay consistent with your spiritual routine.',
    status: 'active',
    accent: 'from-teal-500 to-emerald-500',
    icon: 'moon',
    href: '/dashboard/prayer-times',
  },
  {
    id: 'family',
    name: 'Family',
    description:
      'Manage family events, milestones, and shared calendars to keep everyone in sync.',
    status: 'active',
    accent: 'from-rose-400 to-orange-400',
    icon: 'users',
    href: '/dashboard/family',
  },
  {
    id: 'finance',
    name: 'Finance',
    description:
      'Budget, track expenses, and visualize your financial goals with clean insights.',
    status: 'active',
    accent: 'from-emerald-500 to-green-600',
    icon: 'wallet',
    href: '/dashboard/finance',
  },
  {
    id: 'travel',
    name: 'Travel',
    description:
      'Plan trips, save itineraries, and keep your adventures organized in one place.',
    status: 'active',
    accent: 'from-sky-500 to-cyan-500',
    icon: 'plane',
    href: '/dashboard/travel',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    description:
      'Build smart lists, compare prices, and never forget the essentials again.',
    status: 'active',
    accent: 'from-amber-400 to-yellow-500',
    icon: 'shopping-cart',
    href: '/dashboard/shopping',
  },
  {
    id: 'health',
    name: 'Health',
    description:
      'Log workouts, monitor habits, and keep your wellbeing front of mind.',
    status: 'active',
    accent: 'from-red-400 to-rose-500',
    icon: 'heart-pulse',
    href: '/dashboard/health',
  },
  {
    id: 'community',
    name: 'Community',
    description:
      'Connect with your community, share events, and stay engaged with what matters.',
    status: 'beta',
    accent: 'from-violet-400 to-fuchsia-400',
    icon: 'handshake',
    href: '/dashboard/community',
  },
  {
    id: 'learning',
    name: 'Learning',
    description:
      'Set learning goals, track progress, and build knowledge one step at a time.',
    status: 'beta',
    accent: 'from-indigo-400 to-blue-500',
    icon: 'book-open',
    href: '/dashboard/learning',
  },
];

export function getModuleById(id: string) {
  return lifeModules.find((m) => m.id === id);
}

export const activeModules = lifeModules.filter((m) => m.status === 'active');
export const betaModules = lifeModules.filter((m) => m.status === 'beta');
