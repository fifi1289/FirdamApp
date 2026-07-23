'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { CalendarClock } from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlannerTask, TaskPriority } from '@/types/database';
import {
  usePlannerDate,
  isToday as isDateToday,
} from '@/features/planner/planner-context';
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

const PRIORITY_DOT_STYLES: Record<TaskPriority, string> = {
  high: 'bg-amber-500',
  medium: 'bg-sky-500',
  low: 'bg-emerald-500',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = Number(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

function nowTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

type TimelineItem =
  | { type: 'task'; task: PlannerTask }
  | { type: 'now' };

function TimelineRow({
  task,
  onToggle,
}: {
  task: PlannerTask;
  onToggle: (t: PlannerTask) => void;
}) {
  return (
    <div className="grid grid-cols-[56px_16px_1fr] items-center py-2.5">
      <span className="pr-3 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {task.time ? formatTime(task.time) : '—'}
      </span>
      <div className="relative z-10 flex items-center justify-center">
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full ring-2 ring-card transition-opacity',
            PRIORITY_DOT_STYLES[task.priority],
            task.completed && 'opacity-40'
          )}
        />
      </div>
      <div className="flex items-center gap-3 pl-4">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task)}
          aria-label="Toggle task complete"
          className="h-4 w-4"
        />
        <span
          className={cn(
            'text-sm',
            task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'ml-auto shrink-0 text-[10px] font-medium',
            PRIORITY_BADGE_STYLES[task.priority]
          )}
        >
          {PRIORITY_LABELS[task.priority]}
        </Badge>
      </div>
    </div>
  );
}

function NowMarker() {
  return (
    <div className="grid grid-cols-[56px_16px_1fr] items-center py-2">
      <span />
      <div className="relative z-10 flex items-center justify-center">
        <span className="absolute h-3 w-3 animate-ping rounded-full bg-primary/50" />
        <span className="h-2 w-2 rounded-full bg-primary" />
      </div>
      <div className="flex items-center gap-2 pl-4">
        <span className="h-px flex-1 border-t border-dashed border-primary/30" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
          Now
        </span>
      </div>
    </div>
  );
}

export function DayTimeline() {
  const supabase = createSupabaseBrowserClient();
  const { selectedDate } = usePlannerDate();
  const showNow = isDateToday(selectedDate);

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState(nowTimeString());

  useEffect(() => {
    if (!showNow) return;
    const interval = setInterval(() => setNowTime(nowTimeString()), 60_000);
    return () => clearInterval(interval);
  }, [showNow]);

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

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const timed = tasks
      .filter((t) => t.time)
      .sort((a, b) => a.time!.localeCompare(b.time!));
    const untimed = tasks.filter((t) => !t.time);

    const items: TimelineItem[] = [];
    let nowInserted = false;

    if (showNow) {
      for (const task of timed) {
        if (!nowInserted && task.time! > nowTime) {
          items.push({ type: 'now' });
          nowInserted = true;
        }
        items.push({ type: 'task', task });
      }
      if (!nowInserted && timed.length > 0) {
        items.push({ type: 'now' });
      }
    } else {
      items.push(...timed.map((task) => ({ type: 'task' as const, task })));
    }

    items.push(...untimed.map((task) => ({ type: 'task' as const, task })));

    return items;
  }, [tasks, showNow, nowTime]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Day Timeline</CardTitle>
        {showNow && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading timeline…
          </p>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No tasks scheduled for this day.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div
              className="absolute left-[64px] top-2 bottom-2 w-px bg-border"
              aria-hidden
            />
            {timelineItems.map((item) =>
              item.type === 'now' ? (
                <NowMarker key="now" />
              ) : (
                <TimelineRow
                  key={item.task.id}
                  task={item.task}
                  onToggle={toggleTask}
                />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
