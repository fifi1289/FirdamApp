import { Plus } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TasksList } from '@/features/planner/tasks-list';
import { TodaysFocus } from '@/features/planner/todays-focus';
import { UpNext } from '@/features/planner/up-next';
import { GoalsList } from '@/features/planner/goals-list';
import { NewGoalDialog } from '@/features/planner/goal-form-dialog';
import { PlannerProvider } from '@/features/planner/planner-context';

export const metadata = { title: 'Planner' };

const notes = [
  { id: 1, title: 'Trip ideas — coast', excerpt: 'Beach house options, early August. Compare 3 rentals and book by Friday.', tag: 'Travel' },
  { id: 2, title: 'Book notes — Deep Work', excerpt: 'Schedule blocks, eliminate shallow tasks during peak hours.', tag: 'Learning' },
  { id: 3, title: 'Family meeting', excerpt: 'Discuss school pickup schedule and weekend activities rotation.', tag: 'Family' },
];

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

      {/* Notes */}
      <section aria-labelledby="notes-heading" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Notes</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add note
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {note.title}
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    {note.tag}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {note.excerpt}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      </PlannerProvider>
    </AppShell>
  );
}
