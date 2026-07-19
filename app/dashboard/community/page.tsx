import { ModulePlaceholderPage } from '@/features/modules/module-placeholder-page';

export const metadata = { title: 'Community' };

export default function CommunityPage() {
  return (
    <ModulePlaceholderPage
      moduleId="community"
      icon="handshake"
      title="Community"
      description="Connect with your community, share events, and stay engaged with what matters."
      placeholderDescription="Community connections and shared events are in beta. Check back soon."
    />
  );
}
