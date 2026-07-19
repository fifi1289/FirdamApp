import { ModulePlaceholderPage } from '@/features/modules/module-placeholder-page';

export const metadata = { title: 'Travel' };

export default function TravelPage() {
  return (
    <ModulePlaceholderPage
      moduleId="travel"
      icon="plane"
      title="Travel"
      description="Plan trips, save itineraries, and keep your adventures organized in one place."
      placeholderDescription="Trip planning and itineraries will arrive here soon. Check back later."
    />
  );
}
