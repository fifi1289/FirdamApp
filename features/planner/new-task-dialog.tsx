'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PLANNER_TASKS_CHANGED } from '@/features/planner/tasks-list';
import type { PlannerTask, TaskPriority } from '@/types/database';

const MAX_HIGH_PRIORITY_PER_DAY = 3;

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface TaskFormValues {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  priority: TaskPriority;
}

function taskToValues(task: PlannerTask): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    date: task.scheduled_date,
    startTime: task.time ?? '',
    endTime: task.end_time ?? '',
    completed: task.completed,
    priority: task.priority,
  };
}

function emptyValues(): TaskFormValues {
  return {
    title: '',
    description: '',
    date: todayISO(),
    startTime: '',
    endTime: '',
    completed: false,
    priority: 'medium',
  };
}

export function NewTaskDialog() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TaskFormValues>(emptyValues);

  useEffect(() => {
    if (open) setValues(emptyValues());
  }, [open]);

  return (
    <TaskFormDialog
      mode="create"
      open={open}
      onOpenChange={setOpen}
      values={values}
      onValuesChange={setValues}
      trigger={
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New task
        </Button>
      }
    />
  );
}

interface TaskFormDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: TaskFormValues;
  onValuesChange: (values: TaskFormValues) => void;
  trigger?: React.ReactNode;
  task?: PlannerTask;
}

export function TaskFormDialog({
  mode,
  open,
  onOpenChange,
  values,
  onValuesChange,
  trigger,
  task,
}: TaskFormDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit';
  const update = (patch: Partial<TaskFormValues>) =>
    onValuesChange({ ...values, ...patch });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = values.title.trim();
    if (!trimmed) return;

    if (values.startTime && values.endTime && values.endTime < values.startTime) {
      toast.error('End time is before start time', {
        description: 'Please choose an end time that is after the start time.',
      });
      return;
    }

    const payload = {
      title: trimmed,
      description: values.description.trim() || null,
      scheduled_date: values.date,
      time: values.startTime || null,
      end_time: values.endTime || null,
      completed: values.completed,
      priority: values.priority,
    };

    setSubmitting(true);

    // Ensure the auth session is loaded from cookies before the request so
    // the RLS policy sees a valid auth.uid(). Without this, a stale/in-memory
    // null session can cause the insert to fail with a 42501 RLS error.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSubmitting(false);
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    if (values.priority === 'high') {
      let highQuery = supabase
        .from('planner_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('scheduled_date', values.date)
        .eq('priority', 'high');
      if (isEdit && task) {
        highQuery = highQuery.neq('id', task.id);
      }
      const { count } = await highQuery;
      if ((count ?? 0) >= MAX_HIGH_PRIORITY_PER_DAY) {
        setSubmitting(false);
        toast('Only 3 High Priority tasks per day', {
          description:
            'You already have 3 High Priority tasks for this day. Try changing this one to Medium or Low.',
        });
        return;
      }
    }

    const result = isEdit
      ? await supabase.from('planner_tasks').update(payload).eq('id', task!.id)
      : await supabase.from('planner_tasks').insert(payload);
    setSubmitting(false);

    if (result.error) {
      toast.error(
        isEdit ? 'Could not update task' : 'Could not create task',
        { description: result.error.message }
      );
      return;
    }
    onOpenChange(false);
    toast.success(isEdit ? 'Task updated' : 'Task created');
    window.dispatchEvent(new Event(PLANNER_TASKS_CHANGED));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit task' : 'New task'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the details of your task.'
                : 'Add a task to your planner.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={values.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="What do you need to do?"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description (optional)</Label>
              <Textarea
                id="task-description"
                value={values.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Add any details about this task"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-date">Date</Label>
              <Input
                id="task-date"
                type="date"
                value={values.date}
                onChange={(e) => update({ date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-start-time">Start time (optional)</Label>
                <Input
                  id="task-start-time"
                  type="time"
                  value={values.startTime}
                  onChange={(e) => update({ startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-end-time">End time (optional)</Label>
                <Input
                  id="task-end-time"
                  type="time"
                  value={values.endTime}
                  onChange={(e) => update({ endTime: e.target.value })}
                />
              </div>
            </div>
            {isEdit && (
              <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <Checkbox
                  id="task-completed"
                  checked={values.completed}
                  onCheckedChange={(c) => update({ completed: c === true })}
                />
                <Label htmlFor="task-completed" className="text-sm font-normal">
                  Mark as completed
                </Label>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={values.priority}
                onValueChange={(v) => update({ priority: v as TaskPriority })}
              >
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Up to {MAX_HIGH_PRIORITY_PER_DAY} High-priority tasks per day.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !values.title.trim()}>
              {submitting
                ? isEdit
                  ? 'Saving…'
                  : 'Adding…'
                : isEdit
                ? 'Save changes'
                : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { taskToValues, emptyValues };
