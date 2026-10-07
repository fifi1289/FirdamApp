export type ModuleId =
  | 'halal-places'
  | 'recipes'
  | 'meals'
  | 'shopping'
  | 'pantry'
  | 'prayer-times'
  | 'ramadan'
  | 'quran'
  | 'family'
  | 'calendar'
  | 'planner'
  | 'learning'
  | 'health'
  | 'community'
  | 'travel'
  | 'directory'
  | 'finance';

export type ModuleGroup = 'Halal living' | 'Faith' | 'Family' | 'Community & travel' | 'Money';

export type ModuleStatus = 'active' | 'beta' | 'planned';

export interface LifeModule {
  id: ModuleId;
  name: string;
  description: string;
  status: ModuleStatus;
  /** Tailwind gradient classes used for the module's accent surface. */
  accent: string;
  /** Lucide icon name resolved by <ModuleIcon />. */
  icon: ModuleIconName;
  /** Route the module card links to once implemented. */
  href: string;
  group: ModuleGroup;
  /** Shown as a small badge — e.g. features that need Premium. */
  premium?: boolean;
}

export type ModuleIconName =
  | 'moon'
  | 'moon-star'
  | 'users'
  | 'wallet'
  | 'map-pin'
  | 'shopping-cart'
  | 'book-open'
  | 'archive'
  | 'utensils'
  | 'calendar-heart'
  | 'list-checks'
  | 'chef-hat'
  | 'graduation-cap'
  | 'heart-pulse'
  | 'handshake'
  | 'plane'
  | 'store';

export type Theme = 'light' | 'dark' | 'system';
