import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Plus,
  ArrowRight,
} from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Planner' };

const agenda = [
  { time: '06:30', label: 'Morning routine & reflection', icon: Sunrise, tone: 'text-amber-500' },
  { time: '09:00', label: 'Deep work — project brief', icon: Sun, tone: 'text-sky-500' },
  { time: '12:30', label: 'Lunch & walk', icon: Sun, tone: 'text-emerald-500' },
  { time: '15:00', label: 'Review goals & weekly plan', icon: Sunset, tone: 'text-orange-500' },
  { time: '18:00', label: 'Family time', icon: Moon, tone: 'text-indigo-500' },
  { time: '21:00', label: 'Wind down & journal', icon: Moon, tone: 'text-violet-500' },
];

const tasks = [
  { id: 1, title: 'Draft Q3 budget proposal', done: true, priority: 'High', today: true },
  { id: 2, title: 'Reply to community event invite', done: true, priority: 'Medium', today: true },
  { id: 3, title: 'Plan weekend family trip', done: false, priority: 'Medium', today: false },
  { id: 4, title: 'Review learning module progress', done: false, priority: 'Low', today: false },
  { id: 5, title: 'Book annual health check-up', done: false, priority: 'High', today: true },
  { id: 6, title: 'Organize grocery list', done: false, priority: 'Low', today: false },
];

const todaysTasks = tasks.filter((t) => t.today);

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

const priorityVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  High: 'default',
  Medium: 'secondary',
  Low: 'outline',
};

export default function PlannerPage() {
  return (
    <AppShell>
      <PageHeader
        title="Planner"
        description="Your day, week, and goals — all in one calm view."
      >
        <Button variant="outline" size="sm">
          <CalendarDays className="mr-2 h-4 w-4" />
          This week
        </Button>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New task
        </Button>
      </PageHeader>

      <Tabs defaultValue="today" className="mt-2">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Agenda */}
        <section aria-labelledby="agenda-heading" className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">
                Daily agenda
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                Today
              </Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              {agenda.map((item) => (
                <div
                  key={item.time}
                  className="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40"
                >
                  <span className="w-12 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {item.time}
                  </span>
                  <item.icon className={cn('h-4 w-4 shrink-0', item.tone)} />
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Calendar */}
        <section aria-labelledby="calendar-heading">
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
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <section aria-labelledby="tasks-heading">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">Tasks</CardTitle>
              <span className="text-xs text-muted-foreground">
                {todaysTasks.filter((t) => t.done).length} of {todaysTasks.length} done
              </span>
            </CardHeader>
            <CardContent className="space-y-1">
              {todaysTasks.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tasks planned for today.
                </p>
              ) : (
                todaysTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  {task.done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      task.done
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    )}
                  >
                    {task.title}
                  </span>
                  <Badge
                    variant={priorityVariant[task.priority]}
                    className="text-[10px]"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))
              )}
            </CardContent>
          </Card>
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
        </TabsContent>

        <TabsContent value="week" />
        <TabsContent value="month" />
      </Tabs>
    </AppShell>
  );
}
