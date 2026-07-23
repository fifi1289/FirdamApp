import { AppShell } from '@/components/layout/app-shell';
import { TasksList } from '@/features/planner/tasks-list';
import { TodaysFocus } from '@/features/planner/todays-focus';
import { UpNext } from '@/features/planner/up-next';
import { GoalsList } from '@/features/planner/goals-list';
import { NewGoalDialog } from '@/features/planner/goal-form-dialog';
import { PlannerProvider } from '@/features/planner/planner-context';

export const metadata = { title: 'Planner' };

export default function PlannerPage() {
  return (
    <AppShell>
      <PlannerProvider>
      <TodaysFocus />

      <div className="mt-6 grid grid-cols-1 gap-6">
        {/* Up Next */}
        <section aria-labelledby="up-next-heading">
          <UpNext />
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <section id="tasks" aria-labelledby="tasks-heading">
          <TasksList />
        </section>

        {/* Goals */}
        <section aria-labelledby="goals-heading" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 id="goals-heading" className="text-base font-semibold">
              Goals
            </h2>
            <NewGoalDialog />
          </div>
          <GoalsList limit={3} />
        </section>
      </div>

      </PlannerProvider>
    </AppShell>
  );
}
