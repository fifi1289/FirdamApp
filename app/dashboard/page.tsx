import { Plus, CalendarDays, Wallet, HeartPulse, Users } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { ModuleCard } from '@/features/modules/module-card';
import { lifeModules } from '@/features/modules/module-config';

const stats = [
  { label: 'Active modules', value: '6', icon: Plus, delta: '+2 this month' },
  { label: 'Upcoming events', value: '4', icon: CalendarDays },
  { label: 'Monthly budget', value: '$2,480', icon: Wallet, delta: 'On track' },
  { label: 'Wellbeing streak', value: '12 days', icon: HeartPulse, delta: '+3 days', trend: 'up' as const },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        title="Welcome back"
        description="Here's a calm overview of everything happening across your life modules."
      >
        <Button variant="outline" size="sm">
          <Users className="mr-2 h-4 w-4" />
          Invite family
        </Button>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add module
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Modules */}
      <div className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Your modules
            </h2>
            <p className="text-sm text-muted-foreground">
              Turn modules on or off to match your life.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {lifeModules.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          More modules are on the way
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Notes, Habits, Goals, and more — built modularly, just like the rest.
        </p>
      </div>
    </AppShell>
  );
}
