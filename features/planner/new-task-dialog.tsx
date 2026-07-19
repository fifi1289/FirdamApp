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
import { useToast } from '@/hooks/use-toast';
import { PLANNER_TASKS_CHANGED } from '@/features/planner/tasks-list';
import type { PlannerTask } from '@/types/database';

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
}

function taskToValues(task: PlannerTask): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    date: task.scheduled_date,
    startTime: task.time ?? '',
    endTime: task.end_time ?? '',
    completed: task.completed,
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
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit';
  const update = (patch: Partial<TaskFormValues>) =>
    onValuesChange({ ...values, ...patch });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = values.title.trim();
    if (!trimmed) return;

    if (values.startTime && values.endTime && values.endTime < values.startTime) {
      toast({
        title: 'End time is before start time',
        description: 'Please choose an end time that is after the start time.',
        variant: 'destructive',
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
    };

    setSubmitting(true);
    const result = isEdit
      ? await supabase.from('planner_tasks').update(payload).eq('id', task!.id)
      : await supabase.from('planner_tasks').insert(payload);
    setSubmitting(false);

    if (result.error) {
      toast({
        title: isEdit ? 'Could not update task' : 'Could not create task',
        description: result.error.message,
        variant: 'destructive',
      });
      return;
    }
    onOpenChange(false);
    toast({ title: isEdit ? 'Task updated' : 'Task created' });
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
