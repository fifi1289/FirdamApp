'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { CalendarDays, ArrowRight } from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NewTaskDialog } from '@/features/planner/new-task-dialog';
import { PLANNER_TASKS_CHANGED } from '@/features/planner/tasks-list';
import { cn } from '@/lib/utils';
import type { PlannerTask } from '@/types/database';

function buildDisplayName(
  user: { user_metadata?: Record<string, unknown>; email?: string } | null
): string {
  const meta = user?.user_metadata ?? {};
  const first = meta.first_name ? String(meta.first_name) : '';
  const last = meta.last_name ? String(meta.last_name) : '';
  const full = [first, last].filter(Boolean).join(' ').trim();
  if (full) return full;
  const direct = (meta.full_name ?? meta.name) as string | undefined;
  if (direct) return String(direct);
  if (user?.email) return user.email;
  return 'friend';
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function subtitleFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Take a breath. A calm, intentional day starts here.';
  if (h < 18) return 'Keep the momentum steady. One task at a time.';
  return 'Reflect on today. Ease gently into the evening.';
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function toLocalDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = Number(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return '';
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

const PRIORITY_BADGES = [
  { ring: 'ring-amber-500/40', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { ring: 'ring-sky-500/40', badge: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  { ring: 'ring-emerald-500/40', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
];

export function TodaysFocus() {
  const supabase = createSupabaseBrowserClient();
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const dateKey = toLocalDateInputValue(selectedDate);
  const isToday = dateKey === toLocalDateInputValue(new Date());

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('scheduled_date', dateKey)
      .order('time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load tasks:', error.message);
    }
    setTasks(data ?? []);
    setDataLoading(false);
  }, [supabase, dateKey]);

  useEffect(() => {
    setDataLoading(true);
    loadTasks();
    const handler = () => loadTasks();
    window.addEventListener(PLANNER_TASKS_CHANGED, handler);
    return () => window.removeEventListener(PLANNER_TASKS_CHANGED, handler);
  }, [loadTasks]);

  const focusTasks = useMemo(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    const complete = tasks.filter((t) => t.completed);
    const ordered = [...incomplete, ...complete].slice(0, 3);
    return ordered;
  }, [tasks]);

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

  const firstName = useMemo(() => {
    const full = buildDisplayName(user);
    return full.split(' ')[0] ?? full;
  }, [user]);

  const greeting = greetingFor(selectedDate);
  const subtitle = subtitleFor(selectedDate);

  return (
    <section className="space-y-6">
      {/* Greeting + date selector */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          {loading ? (
            <div className="h-9 w-64 animate-pulse rounded-lg bg-muted/60" />
          ) : (
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {greeting}, {firstName}{' '}
              <span className="text-brand-light" aria-hidden>🌿</span>
            </h1>
          )}
          <p className="max-w-xl text-sm text-muted-foreground md:text-base">
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={dateKey}
              onChange={(e) => {
                const v = e.target.value;
                if (v) setSelectedDate(new Date(`${v}T00:00:00`));
              }}
              className="w-[180px] pl-9 text-sm"
              aria-label="Select date"
            />
          </div>
          <NewTaskDialog />
        </div>
      </div>

      {/* Today's Focus card */}
      <Card
        className={cn(
          'overflow-hidden rounded-2xl border border-border/50 bg-card p-8 shadow-sm md:p-10',
          'shadow-[0_8px_30px_-12px_rgba(122,59,30,0.12)]'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Today&apos;s Focus
            </h2>
            <span className="text-sm text-muted-foreground">
              {isToday ? 'Top 3 priorities' : formatDateLong(selectedDate)}
            </span>
          </div>
          <span className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground sm:block">
            {focusTasks.filter((t) => t.completed).length} of {focusTasks.length} done
          </span>
        </div>

        <div className="mt-7 space-y-3">
          {dataLoading ? (
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/30 p-5"
              >
                <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
                <div className="h-5 flex-1 animate-pulse rounded-md bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              </div>
            ))
          ) : focusTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                Nothing scheduled yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a task to set your focus for the day.
              </p>
              <div className="mt-5 flex justify-center">
                <NewTaskDialog />
              </div>
            </div>
          ) : (
            focusTasks.map((task, index) => {
              const priority = index + 1;
              const badge = PRIORITY_BADGES[index] ?? PRIORITY_BADGES[2]!;
              return (
                <div
                  key={task.id}
                  className={cn(
                    'group flex items-center gap-4 rounded-xl border border-border/40 bg-background/60 p-5 transition-all duration-300 ease-out-expo hover:border-border hover:bg-muted/30',
                    task.completed && 'opacity-60'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2',
                      badge.ring
                    )}
                  >
                    {priority}
                  </div>

                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task)}
                    aria-label="Toggle task complete"
                    className="h-5 w-5"
                  />

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span
                      className={cn(
                        'text-base font-medium text-foreground',
                        task.completed && 'line-through'
                      )}
                    >
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {task.description}
                      </span>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className={cn('shrink-0 border text-[11px]', badge.badge)}
                  >
                    Priority
                  </Badge>

                  {task.time && (
                    <span className="hidden shrink-0 text-sm font-medium tabular-nums text-muted-foreground sm:block">
                      {formatTimeRange(task.time, task.end_time)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-7 flex items-center justify-between border-t border-border/40 pt-5">
          <p className="text-sm text-muted-foreground">
            {isToday ? 'Three things. One day. Steady progress.' : 'Focus for this day.'}
          </p>
          <Button asChild variant="link" size="sm" className="h-auto px-0 text-primary">
            <Link href="#tasks">
              View all tasks
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}
