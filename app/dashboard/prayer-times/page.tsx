import { ModulePlaceholderPage } from '@/features/modules/module-placeholder-page';

export const metadata = { title: 'Prayer Times' };

export default function PrayerTimesPage() {
  return (
    <ModulePlaceholderPage
      moduleId="prayer-times"
      icon="moon"
      title="Prayer Times"
      description="Track daily prayer schedules, set reminders, and stay consistent with your spiritual routine."
      placeholderDescription="We're building prayer schedules, reminders, and streak tracking here. Check back soon."
    />
  );
}
