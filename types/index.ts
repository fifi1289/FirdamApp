export type ModuleId =
  | 'halal-places'
  | 'meals'
  | 'pantry'
  | 'groceries'
  | 'prayer-times'
  | 'ramadan'
  | 'quran'
  | 'family'
  | 'calendar'
  | 'planner'
  | 'budget';

export type ModuleGroup = 'Halal living' | 'Faith' | 'Family' | 'Money';

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
  | 'list-checks';

export type Theme = 'light' | 'dark' | 'system';
