import { AppShell } from '@/components/layout/app-shell';
import { SettingsClient } from '@/components/settings/settings-client';

export const metadata = {
  title: 'Settings',
};

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsClient profile={null} />
    </AppShell>
  );
}
