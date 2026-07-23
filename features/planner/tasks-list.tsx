'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlannerTask, TaskPriority } from '@/types/database';
import { PRIORITY_ORDER } from '@/types/database';
import {
  TaskFormDialog,
  taskToValues,
  emptyValues,
  type TaskFormValues,
} from '@/features/planner/new-task-dialog';
import { usePlannerDate } from '@/features/planner/planner-context';

export const PLANNER_TASKS_CHANGED = 'planner-tasks-changed';

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

export function TasksList() {
  const supabase = createSupabaseBrowserClient();
  const { selectedDate } = usePlannerDate();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [editValues, setEditValues] = useState<TaskFormValues>(emptyValues());
  const [editOpen, setEditOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<PlannerTask | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const startEdit = (task: PlannerTask) => {
    setEditingTask(task);
    setEditValues(taskToValues(task));
    setEditOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    const id = deletingTask.id;
    setDeleting(true);
    const { error } = await supabase.from('planner_tasks').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      console.error('Failed to delete task:', error.message);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeleteOpen(false);
    setDeletingTask(null);
  };

  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
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
            No tasks for this day.
          </p>
        ) : (
          sorted.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task)}
                aria-label="Toggle task complete"
              />
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex flex-1 flex-col">
                <span
                  className={cn(
                    'text-sm',
                    task.completed
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  )}
                >
                  {task.title}
                </span>
                {task.description && (
                  <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {task.description}
                  </span>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn('shrink-0 text-[10px] font-medium', PRIORITY_BADGE_STYLES[task.priority])}
              >
                {PRIORITY_LABELS[task.priority]}
              </Badge>
              {task.time && (
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {formatTimeRange(task.time, task.end_time)}
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Task actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => startEdit(task)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setDeletingTask(task);
                      setDeleteOpen(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </CardContent>

      <TaskFormDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        values={editValues}
        onValuesChange={setEditValues}
        task={editingTask ?? undefined}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTask
                ? `"${deletingTask.title}" will be permanently removed.`
                : 'This task will be permanently removed.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
