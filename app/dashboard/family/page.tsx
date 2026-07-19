import { ModulePlaceholderPage } from '@/features/modules/module-placeholder-page';

export const metadata = { title: 'Family' };

export default function FamilyPage() {
  return (
    <ModulePlaceholderPage
      moduleId="family"
      icon="users"
      title="Family"
      description="Manage family events, milestones, and shared calendars to keep everyone in sync."
      placeholderDescription="Family events, milestones, and shared calendars will live here. Check back soon."
    />
  );
}
