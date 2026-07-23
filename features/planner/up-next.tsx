'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { CalendarPlus, CheckCircle2, Sparkles, Clock } from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlannerTask, TaskPriority } from '@/types/database';
import { usePlannerDate } from '@/features/planner/planner-context';
import { PLANNER_TASKS_CHANGED } from '@/features/planner/tasks-list';

const PRIORITY_BADGE_STYLES: Record<TaskPriority, string> = {
  high: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  medium: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function formatTime(time: string | null): string {
  if (!time) return 'Anytime';
  const [h, m] = time.split(':');
  const hour = Number(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

function sortByTime(a: PlannerTask, b: PlannerTask): number {
  if (a.time && b.time) return a.time.localeCompare(b.time);
  if (a.time) return -1;
  if (b.time) return 1;
  return a.created_at.localeCompare(b.created_at);
}

export function UpNext() {
  const supabase = createSupabaseBrowserClient();
  const { selectedDate } = usePlannerDate();

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('scheduled_date', selectedDate)
      .order('time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load tasks:', error.message);
    }
    setTasks(data ?? []);
    setLoading(false);
  }, [supabase, selectedDate]);

  useEffect(() => {
    setLoading(true);
    loadTasks();
    const handler = () => loadTasks();
    window.addEventListener(PLANNER_TASKS_CHANGED, handler);
    return () => window.removeEventListener(PLANNER_TASKS_CHANGED, handler);
  }, [loadTasks]);

  const toggleTask = async (task: PlannerTask) => {
    const next = !task.completed;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: next } : t))
    );
    const { error } = await supabase
      .from('planner_tasks')
      .update({ completed: next })
      .eq('id', task.id);
    if (error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !next } : t))
      );
    }
  };

  const incomplete = useMemo(
    () => tasks.filter((t) => !t.completed).sort(sortByTime),
    [tasks]
  );

  const nextTask = incomplete[0] ?? null;
  const upcoming = incomplete.slice(1);
  const allDone = tasks.length > 0 && incomplete.length === 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Up Next
        </CardTitle>
        {!loading && incomplete.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {incomplete.length} remaining
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CalendarPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                No tasks for today yet
              </p>
              <p className="text-xs text-muted-foreground">
                Add a task to start planning your day.
              </p>
            </div>
          </div>
        ) : allDone ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">
              You&apos;re all caught up for today.
            </p>
            <p className="text-xs text-muted-foreground">
              Great work — enjoy the rest of your day.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Next Task — highlighted */}
            {nextTask && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Next Task
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={nextTask.completed}
                    onCheckedChange={() => toggleTask(nextTask)}
                    aria-label="Toggle task complete"
                    className="h-5 w-5"
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(nextTask.time)}
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {nextTask.title}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] font-medium',
                      PRIORITY_BADGE_STYLES[nextTask.priority]
                    )}
                  >
                    {PRIORITY_LABELS[nextTask.priority]}
                  </Badge>
                </div>
              </div>
            )}

            {/* Remaining upcoming tasks */}
            {upcoming.length > 0 && (
              <ul className="space-y-1">
                {upcoming.map((task) => (
                  <li
                    key={task.id}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task)}
                      aria-label="Toggle task complete"
                      className="h-4 w-4"
                    />
                    <span className="w-20 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {formatTime(task.time)}
                    </span>
                    <span className="flex-1 truncate text-sm text-foreground">
                      {task.title}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[10px] font-medium',
                        PRIORITY_BADGE_STYLES[task.priority]
                      )}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
