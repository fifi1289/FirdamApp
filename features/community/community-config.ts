import {
  BookOpen,
  Gift,
  GraduationCap,
  HandHeart,
  Heart,
  Landmark,
  MoonStar,
  PartyPopper,
  Smile,
  Sparkles,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

import type { CommunityEventKind } from '@/types/database';

export const EVENT_KIND_META: Record<CommunityEventKind, { label: string; icon: LucideIcon }> = {
  halaqa: { label: 'Halaqa', icon: BookOpen },
  iftar: { label: 'Community iftar', icon: UtensilsCrossed },
  eid: { label: 'Eid', icon: PartyPopper },
  jumuah: { label: "Jumu'ah", icon: Landmark },
  fundraiser: { label: 'Fundraiser', icon: HandHeart },
  volunteering: { label: 'Volunteering', icon: Heart },
  sisters: { label: "Sisters' event", icon: Sparkles },
  youth: { label: 'Youth', icon: Users },
  kids: { label: 'Kids', icon: Smile },
  social: { label: 'Social', icon: Gift },
  class: { label: 'Class / course', icon: GraduationCap },
  other: { label: 'Other', icon: MoonStar },
};

export const AUDIENCES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'families', label: 'Families' },
  { value: 'brothers', label: 'Brothers' },
  { value: 'sisters', label: 'Sisters' },
  { value: 'youth', label: 'Youth' },
  { value: 'kids', label: 'Kids' },
] as const;
