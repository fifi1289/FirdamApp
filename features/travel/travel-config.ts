import { Briefcase, Home, Landmark, Luggage, MoonStar, Plane, type LucideIcon } from 'lucide-react';

import type { TripKind } from '@/types/database';
import { TRIP_KIND_LABELS } from '@/features/travel/travel-data';

export { HAJJ_DAYS, TRAVEL_TIPS, UMRAH_STEPS, defaultChecklist, daysUntil } from '@/features/travel/travel-data';

const ICONS: Record<TripKind, LucideIcon> = {
  holiday: Plane,
  umrah: MoonStar,
  hajj: Landmark,
  family_visit: Home,
  business: Briefcase,
  other: Luggage,
};

export const TRIP_KINDS: Record<TripKind, { label: string; icon: LucideIcon }> = Object.fromEntries(
  (Object.keys(ICONS) as TripKind[]).map((k) => [k, { label: TRIP_KIND_LABELS[k], icon: ICONS[k] }])
) as Record<TripKind, { label: string; icon: LucideIcon }>;
