export type ModuleId =
  | 'prayer-times'
  | 'family'
  | 'finance'
  | 'travel'
  | 'shopping'
  | 'health'
  | 'community'
  | 'learning';

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
}

export type ModuleIconName =
  | 'moon'
  | 'users'
  | 'wallet'
  | 'plane'
  | 'shopping-cart'
  | 'heart-pulse'
  | 'handshake'
  | 'book-open';

export type Theme = 'light' | 'dark' | 'system';
