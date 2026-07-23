import {
  Plus,
  ArrowRight,
} from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TasksList } from '@/features/planner/tasks-list';
import { TodaysFocus } from '@/features/planner/todays-focus';
import { DayTimeline } from '@/features/planner/day-timeline';
import { PlannerProvider } from '@/features/planner/planner-context';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Planner' };

const goals = [
  { title: 'Read 12 books this year', progress: 58, detail: '7 of 12 books' },
  { title: 'Run 3x per week', progress: 80, detail: 'This month streak: 4 weeks' },
  { title: 'Save for family trip', progress: 45, detail: '$2,250 of $5,000' },
  { title: 'Launch side project', progress: 30, detail: 'MVP in progress' },
];

const notes = [
  { id: 1, title: 'Trip ideas — coast', excerpt: 'Beach house options, early August. Compare 3 rentals and book by Friday.', tag: 'Travel' },
  { id: 2, title: 'Book notes — Deep Work', excerpt: 'Schedule blocks, eliminate shallow tasks during peak hours.', tag: 'Learning' },
  { id: 3, title: 'Family meeting', excerpt: 'Discuss school pickup schedule and weekend activities rotation.', tag: 'Family' },
];

const calendarDays = [
  { day: 'Mon', date: 14, active: false },
  { day: 'Tue', date: 15, active: false },
  { day: 'Wed', date: 16, active: true },
  { day: 'Thu', date: 17, active: false },
  { day: 'Fri', date: 18, active: false },
  { day: 'Sat', date: 19, active: false },
  { day: 'Sun', date: 20, active: false },
];

export default function PlannerPage() {
  return (
    <AppShell>
      <PlannerProvider>
      <TodaysFocus />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <section aria-labelledby="calendar-heading" className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">Calendar</CardTitle>
              <span className="text-xs text-muted-foreground">July 2026</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((d) => (
                  <div
                    key={d.day}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg py-2 transition-colors',
                      d.active
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/60'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-medium uppercase tracking-wide',
                        d.active ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}
                    >
                      {d.day}
                    </span>
                    <span className="text-sm font-semibold">{d.date}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    3 events this week
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Next: Family dinner, Fri 19:00
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Day Timeline */}
        <section aria-labelledby="timeline-heading" className="lg:col-span-2">
          <DayTimeline />
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <section id="tasks" aria-labelledby="tasks-heading">
          <TasksList />
        </section>

        {/* Goals */}
        <section aria-labelledby="goals-heading">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">Goals</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                View all
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {goals.map((goal) => (
                <div key={goal.title} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {goal.title}
                    </p>
                    <span className="text-xs font-medium text-muted-foreground">
                      {goal.progress}%
                    </span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{goal.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
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
