import { Briefcase, Home, Landmark, Luggage, MoonStar, Plane, type LucideIcon } from 'lucide-react';

import type { ChecklistItem, TripKind } from '@/types/database';

export const TRIP_KINDS: Record<TripKind, { label: string; icon: LucideIcon }> = {
  holiday: { label: 'Holiday', icon: Plane },
  umrah: { label: 'Umrah', icon: MoonStar },
  hajj: { label: 'Hajj', icon: Landmark },
  family_visit: { label: 'Family visit', icon: Home },
  business: { label: 'Business', icon: Briefcase },
  other: { label: 'Other', icon: Luggage },
};

const ESSENTIALS = [
  'Passports (valid 6+ months) and visas',
  'Travel insurance documents',
  'Tickets and booking confirmations',
  'Phone charger and travel adapter',
  'Medications and a small first-aid kit',
];

const FAITH = [
  'Travel prayer mat',
  'Small Quran or dua book',
  'Refillable bottle for wudu',
  'Halal snacks for the journey',
];

const UMRAH = [
  'Ihram garments (two white unstitched sheets for men)',
  'Modest, comfortable clothing for women',
  'Unscented soap, shampoo and deodorant (for ihram)',
  'Comfortable sandals for Tawaf and Sa’i',
  'Meningitis ACWY vaccination certificate',
  'Small bag for shoes in the Haram',
  'List of duas and people who asked you to pray for them',
];

const HAJJ_EXTRA = [
  'Small pouch for pebbles (Jamarat)',
  'Light sleeping mat for Muzdalifah',
  'Sun umbrella and cooling spray',
  'Copy of your Hajj group’s contact details',
];

const KIDS = ['Snacks and activities for the children', 'Children’s medicine and plasters'];

function toItems(group: string, texts: string[]): ChecklistItem[] {
  return texts.map((text, i) => ({ id: `${group}-${i}`, text, done: false, group }));
}

export function defaultChecklist(kind: TripKind, travellers: number): ChecklistItem[] {
  const items = [...toItems('Essentials', ESSENTIALS), ...toItems('Faith', FAITH)];
  if (kind === 'umrah' || kind === 'hajj') items.push(...toItems('Umrah', UMRAH));
  if (kind === 'hajj') items.push(...toItems('Hajj', HAJJ_EXTRA));
  if (travellers > 2) items.push(...toItems('Family', KIDS));
  return items;
}

export const UMRAH_STEPS: { title: string; detail: string }[] = [
  {
    title: 'Ihram at the miqat',
    detail:
      'Before crossing the miqat, perform ghusl, wear ihram, make the intention for Umrah and begin the Talbiyah: “Labbayk Allahumma labbayk…”. Avoid the prohibitions of ihram from now on.',
  },
  {
    title: 'Tawaf',
    detail:
      'Circle the Kaaba seven times anticlockwise, starting and ending at the Black Stone (al-Hajar al-Aswad), making dua and dhikr throughout.',
  },
  {
    title: 'Two rak‘ahs and Zamzam',
    detail:
      'Pray two rak‘ahs, behind Maqam Ibrahim if it is easy to do so, then drink Zamzam water.',
  },
  {
    title: 'Sa‘i',
    detail: 'Walk seven times between Safa and Marwah, starting at Safa and ending at Marwah.',
  },
  {
    title: 'Halq or taqsir',
    detail:
      'Men shave their head or shorten the hair; women cut a fingertip’s length from their hair. Your Umrah is now complete and the restrictions of ihram are lifted.',
  },
];

export const HAJJ_DAYS: { day: string; title: string; detail: string }[] = [
  { day: '8 Dhul Hijjah', title: 'Day of Tarwiyah — Mina', detail: 'Enter ihram for Hajj and go to Mina, praying the prayers there.' },
  { day: '9 Dhul Hijjah', title: 'Day of Arafah', detail: 'Stand at Arafah from after midday until sunset in dua — the heart of Hajj. Spend the night at Muzdalifah.' },
  { day: '10 Dhul Hijjah', title: 'Day of Eid — Nahr', detail: 'Stone Jamarat al-Aqabah, offer the sacrifice, shave or trim, then perform Tawaf al-Ifadah and Sa‘i.' },
  { day: '11–13 Dhul Hijjah', title: 'Days of Tashreeq — Mina', detail: 'Stay in Mina and stone the three Jamarat each day after midday (you may leave on the 12th before sunset).' },
  { day: 'Before leaving', title: 'Farewell Tawaf', detail: 'Perform Tawaf al-Wada as your last act in Makkah.' },
];

export const TRAVEL_TIPS: string[] = [
  'As a traveller you may shorten four-rak‘ah prayers to two; most scholars also allow combining Dhuhr with Asr and Maghrib with Isha. Follow the school you trust.',
  'Save your destination in Firdam before you fly — prayer times, the Qibla and halal food are ready when you land.',
  'Check whether your airline offers a Muslim meal (MOML) and request it at least 48 hours before departure.',
  'Many airports have multi-faith prayer rooms — search the airport map for “prayer room”.',
];
