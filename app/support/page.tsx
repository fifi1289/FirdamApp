import { LifeBuoy } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';

export const metadata = { title: 'Support' };

export default function SupportPage() {
  return (
    <AppShell>
      <PageHeader
        title="Support"
        description="Get help, browse FAQs, and reach out to the Firdam team."
      />
      <Placeholder
        icon={LifeBuoy}
        title="Support is coming soon"
        description="Help center, FAQs, and contact options will be available here. Check back soon."
      />
    </AppShell>
  );
}
