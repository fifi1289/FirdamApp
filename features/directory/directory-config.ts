import {
  BedDouble,
  Briefcase,
  ChefHat,
  Compass,
  GraduationCap,
  Landmark,
  Plane,
  School,
  Store,
  type LucideIcon,
} from 'lucide-react';

import type { BusinessCategory } from '@/types/database';

export const BUSINESS_CATEGORIES: Record<BusinessCategory, { label: string; plural: string; icon: LucideIcon }> = {
  travel_agency: { label: 'Travel agency', plural: 'Travel agencies', icon: Plane },
  hajj_umrah: { label: 'Hajj & Umrah operator', plural: 'Hajj & Umrah', icon: Landmark },
  halal_hotel: { label: 'Halal-friendly hotel', plural: 'Halal-friendly stays', icon: BedDouble },
  tour_guide: { label: 'Tour guide', plural: 'Tours & guides', icon: Compass },
  islamic_school: { label: 'Islamic school', plural: 'Islamic schools', icon: School },
  tutor: { label: 'Quran & Arabic tutor', plural: 'Tutors', icon: GraduationCap },
  halal_catering: { label: 'Halal catering', plural: 'Halal catering', icon: ChefHat },
  islamic_finance: { label: 'Islamic finance', plural: 'Islamic finance', icon: Briefcase },
  other: { label: 'Other', plural: 'Other', icon: Store },
};

export const TRAVEL_CATEGORIES: BusinessCategory[] = ['hajj_umrah', 'travel_agency', 'halal_hotel', 'tour_guide'];
export const LEARNING_CATEGORIES: BusinessCategory[] = ['tutor', 'islamic_school'];

export const SERVICE_SUGGESTIONS: Partial<Record<BusinessCategory, string[]>> = {
  hajj_umrah: ['Umrah packages', 'Hajj packages', 'Ramadan Umrah', 'Visa assistance', 'Group tours', 'Scholar-led groups'],
  travel_agency: ['Flights', 'Halal holidays', 'Family packages', 'Visa assistance', 'Hotel bookings'],
  halal_hotel: ['Halal breakfast', 'Prayer room', 'Qibla in rooms', 'No alcohol on site', 'Family rooms'],
  tour_guide: ['Islamic heritage tours', 'City tours', 'Private guides'],
  tutor: ['Quran recitation', 'Hifz', 'Tajweed', 'Arabic', 'Islamic studies', 'Online classes'],
  islamic_school: ['Full-time school', 'Weekend school', 'Hifz programme', 'Nursery'],
  halal_catering: ['Weddings', 'Aqiqah', 'Iftar events', 'Corporate'],
  islamic_finance: ['Halal mortgages', 'Investments', 'Zakat advice', 'Wills'],
};
