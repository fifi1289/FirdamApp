import {
  Beef,
  Coffee,
  Landmark,
  ShoppingBasket,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

import type { CommunityHalalStatus, HalalPlaceCategory } from '@/types/database';

export interface CategoryMeta {
  label: string;
  plural: string;
  icon: LucideIcon;
  /** Matches `.firdam-pin--{variant}` in globals.css */
  variant: HalalPlaceCategory;
  glyph: string;
  /** Tailwind classes for the small chip in lists */
  chip: string;
}

export const CATEGORY_META: Record<HalalPlaceCategory, CategoryMeta> = {
  grocery: {
    label: 'Grocery',
    plural: 'Groceries',
    icon: ShoppingBasket,
    variant: 'grocery',
    glyph: 'G',
    chip: 'bg-brand-sage/10 text-brand-sage border-brand-sage/25',
  },
  butcher: {
    label: 'Butcher',
    plural: 'Butchers',
    icon: Beef,
    variant: 'butcher',
    glyph: 'B',
    chip: 'bg-destructive/10 text-destructive border-destructive/25',
  },
  restaurant: {
    label: 'Restaurant',
    plural: 'Restaurants',
    icon: UtensilsCrossed,
    variant: 'restaurant',
    glyph: 'R',
    chip: 'bg-primary/10 text-primary border-primary/25',
  },
  cafe: {
    label: 'Café & bakery',
    plural: 'Cafés & bakeries',
    icon: Coffee,
    variant: 'cafe',
    glyph: 'C',
    chip: 'bg-brand-gold/15 text-[#8a6537] dark:text-brand-gold border-brand-gold/30',
  },
  mosque: {
    label: 'Mosque',
    plural: 'Mosques',
    icon: Landmark,
    variant: 'mosque',
    glyph: 'M',
    chip: 'bg-foreground/5 text-foreground border-foreground/15',
  },
  other: {
    label: 'Other',
    plural: 'Other',
    icon: Store,
    variant: 'other',
    glyph: '•',
    chip: 'bg-muted text-muted-foreground border-border',
  },
};

export const FILTER_CATEGORIES: HalalPlaceCategory[] = [
  'grocery',
  'butcher',
  'restaurant',
  'cafe',
  'mosque',
];

export const RADIUS_OPTIONS = [1, 3, 5, 10, 25] as const;
export type RadiusKm = (typeof RADIUS_OPTIONS)[number];

export type HalalStatus = 'halal' | 'halal_only' | 'halal_options' | 'muslim_owned' | 'mosque';

export const HALAL_STATUS_LABEL: Record<HalalStatus, string> = {
  halal: 'Halal',
  halal_only: 'Fully halal',
  halal_options: 'Halal options',
  muslim_owned: 'Muslim-owned',
  mosque: 'Mosque',
};

export const COMMUNITY_STATUS_OPTIONS: { value: CommunityHalalStatus; label: string; hint: string }[] = [
  { value: 'halal', label: 'Halal', hint: 'Everything sold or served is halal' },
  { value: 'halal_options', label: 'Halal options', hint: 'Some items are halal' },
  { value: 'muslim_owned', label: 'Muslim-owned', hint: 'Owned by Muslims; ask about meat' },
];

/**
 * Widely recognised halal certification bodies, grouped loosely by region.
 * Users can also type a body that isn't listed.
 */
export const CERTIFICATION_BODIES = [
  'HMA — Halal Monitoring Authority (Canada)',
  'ISNA Halal Canada',
  'HCA — Halal Certification Authority (Canada)',
  'IFANCA (USA)',
  'HFSAA (USA)',
  'HMC — Halal Monitoring Committee (UK)',
  'HFA — Halal Food Authority (UK)',
  'ESMA (UAE)',
  'SFDA / Saudi Halal Center',
  'JAKIM (Malaysia)',
  'MUI / BPJPH (Indonesia)',
  'MUIS (Singapore)',
  'AFIC (Australia)',
] as const;

export const NOT_CERTIFIED = 'Not certified / unknown';
