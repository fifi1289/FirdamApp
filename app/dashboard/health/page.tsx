import { HeartPulse } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';

export const metadata = { title: 'Health' };

export default function HealthPage() {
  return (
    <AppShell>
      <PageHeader title="Health" description="Healthy and sunnah habits, plus appointments, vaccinations and allergies." />
      <Placeholder
        icon={HeartPulse}
        title="Health is coming soon"
        description="Habit tracking and family health records are on the way, in sha Allah."
      />
    </AppShell>
  );
}
