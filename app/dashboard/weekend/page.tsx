import { Sun } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';
import { WeekendPlanner } from '@/features/weekend/weekend-planner';
import { getModuleById, moduleIconMap } from '@/features/modules/module-config';
import { tr, trn } from '@/lib/i18n';

export const metadata = { title: 'Weekend' };

/** Weekend programs are "coming soon" (module status `planned`); set it back to `active` to open them. */
export default function WeekendPage() {
  const mod = getModuleById('weekend');
  if (mod?.status === 'planned') {
    const Icon = moduleIconMap[mod.icon] ?? Sun;
    return (
      <AppShell>
        <PageHeader title={trn(mod.name)} description={tr(mod.description)} />
        <Placeholder
          icon={Icon}
          title={tr('{0} is coming soon', [mod.name])}
          description={tr('{0} We\'re putting the finishing touches on it, in sha Allah.', [mod.description])}
        />
      </AppShell>
    );
  }
  return <WeekendPlanner />;
}
