import { AppShell } from '@/components/layout/app-shell';
import { SettingsClient } from '@/components/settings/settings-client';
import { requireAuth } from '@/lib/auth/require-auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const { profile } = await requireAuth();

  return (
    <AppShell>
      <SettingsClient profile={profile} />
    </AppShell>
  );
}
