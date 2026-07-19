import { ModulePlaceholderPage } from '@/features/modules/module-placeholder-page';

export const metadata = { title: 'Health' };

export default function HealthPage() {
  return (
    <ModulePlaceholderPage
      moduleId="health"
      icon="heart-pulse"
      title="Health"
      description="Log workouts, monitor habits, and keep your wellbeing front of mind."
      placeholderDescription="Workout logs and habit tracking are on the way. Check back soon."
    />
  );
}
