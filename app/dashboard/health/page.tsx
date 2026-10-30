import { HeartPulse } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';
import { tr } from '@/lib/i18n';

export const metadata = { title: 'Health' };

export default function HealthPage() {
  return (
    <AppShell>
      <PageHeader title={tr('Health')} description={tr('Healthy and sunnah habits, plus appointments, vaccinations and allergies.')} />
      <Placeholder
        icon={HeartPulse}
        title={tr('Health is coming soon')}
        description={tr('Habit tracking and family health records are on the way, in sha Allah.')}
      />
    </AppShell>
  );
}
