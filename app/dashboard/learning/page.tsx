import { ModulePlaceholderPage } from '@/features/modules/module-placeholder-page';

export const metadata = { title: 'Learning' };

export default function LearningPage() {
  return (
    <ModulePlaceholderPage
      moduleId="learning"
      icon="book-open"
      title="Learning"
      description="Set learning goals, track progress, and build knowledge one step at a time."
      placeholderDescription="Learning goals and progress tracking are in beta. Check back soon."
    />
  );
}
