import { CalendarHeart } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';
import { CalendarDashboard } from '@/features/calendar/calendar-dashboard';
import { getModuleById, moduleIconMap } from '@/features/modules/module-config';

export const metadata = { title: 'Family Calendar' };

/**
 * The Family Calendar is gated as "coming soon" (module status `planned`).
 * The sidebar entry and dashboard card are already non-clickable, but the
 * route itself must enforce the gate too — otherwise any link to
 * /dashboard/calendar (e.g. the dashboard "Coming up" widget) bypasses it.
 * Flipping the module status back to `active` re-enables the full calendar.
 */
export default function CalendarPage() {
  const mod = getModuleById('calendar');
  if (mod?.status === 'planned') {
    const Icon = moduleIconMap[mod.icon] ?? CalendarHeart;
    return (
      <AppShell>
        <PageHeader title={mod.name} description={mod.description} />
        <Placeholder
          icon={Icon}
          title={`${mod.name} is coming soon`}
          description={`${mod.description} We're putting the finishing touches on it, in sha Allah.`}
        />
      </AppShell>
    );
  }
  return <CalendarDashboard />;
}
