'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { PlannerTask } from '@/types/database';

export const PLANNER_TASKS_CHANGED = 'planner-tasks-changed';

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = Number(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

export function TasksList() {
  const supabase = createSupabaseBrowserClient();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('scheduled_date', today)
      .order('time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load tasks:', error.message);
    }
    setTasks(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
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

  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.created_at.localeCompare(b.created_at);
  });

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Tasks</CardTitle>
        <span className="text-xs text-muted-foreground">
          {completedCount} of {tasks.length} done
        </span>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Loading tasks…
          </p>
        ) : sorted.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No tasks for today.
          </p>
        ) : (
          sorted.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task)}
              />
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'flex-1 text-sm',
                  task.completed
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                )}
              >
                {task.title}
              </span>
              {task.time && (
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {formatTime(task.time)}
                </span>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
