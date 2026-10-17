import {
  Baby,
  CalendarDays,
  Cake,
  GraduationCap,
  Heart,
  HeartHandshake,
  Moon,
  PartyPopper,
  Stethoscope,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

import type { FamilyEventKind } from '@/types/database';

export interface EventKindMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for chips/pills */
  pill: string;
  /** Tailwind class for dots */
  dot: string;
}

export const EVENT_KINDS: Record<FamilyEventKind, EventKindMeta> = {
  eid: {
    label: 'Eid',
    icon: PartyPopper,
    pill: 'bg-brand-gold/20 text-[#7a5a30] dark:text-brand-gold',
    dot: 'bg-brand-gold',
  },
  aqiqah: {
    label: 'Aqiqah',
    icon: Baby,
    pill: 'bg-brand-sage/15 text-brand-sage',
    dot: 'bg-brand-sage',
  },
  nikah: {
    label: 'Nikah',
    icon: Heart,
    pill: 'bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
  walima: {
    label: 'Walima',
    icon: UtensilsCrossed,
    pill: 'bg-destructive/10 text-destructive',
    dot: 'bg-destructive/70',
  },
  birthday: {
    label: 'Birthday',
    icon: Cake,
    pill: 'bg-primary/10 text-primary',
    dot: 'bg-primary',
  },
  anniversary: {
    label: 'Anniversary',
    icon: HeartHandshake,
    pill: 'bg-primary/10 text-primary',
    dot: 'bg-primary/70',
  },
  school: {
    label: 'School',
    icon: GraduationCap,
    pill: 'bg-info/10 text-info',
    dot: 'bg-info',
  },
  appointment: {
    label: 'Appointment',
    icon: Stethoscope,
    pill: 'bg-muted text-foreground',
    dot: 'bg-muted-foreground',
  },
  gathering: {
    label: 'Family gathering',
    icon: Users,
    pill: 'bg-brand-sage/15 text-brand-sage',
    dot: 'bg-brand-sage/70',
  },
  islamic: {
    label: 'Islamic date',
    icon: Moon,
    pill: 'bg-brand-espresso/10 text-brand-espresso dark:bg-brand-gold/15 dark:text-brand-gold',
    dot: 'bg-brand-espresso dark:bg-brand-gold',
  },
  other: {
    label: 'Other',
    icon: CalendarDays,
    pill: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/60',
  },
};

// Shared with the phone app.
export { EDITABLE_KINDS, ISLAMIC_DATES, formatTime, iso, parseISODate } from '@/features/calendar/calendar-core';
