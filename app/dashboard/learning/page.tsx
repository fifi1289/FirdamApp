import { GraduationCap } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';

export const metadata = { title: 'Learning' };

export default function LearningPage() {
  return (
    <AppShell>
      <PageHeader title="Learning" description="Learning goals for every family member, a kids’ corner, and trusted tutors." />
      <Placeholder
        icon={GraduationCap}
        title="Learning is coming soon"
        description="Learning goals, the Arabic alphabet, the 99 Names and more are on the way, in sha Allah."
      />
    </AppShell>
  );
}
