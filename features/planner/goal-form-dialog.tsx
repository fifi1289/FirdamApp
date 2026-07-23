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
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { PLANNER_GOALS_CHANGED } from '@/features/planner/goals-list';
import type { PlannerGoal } from '@/types/database';

export interface GoalFormValues {
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  completed: boolean;
}

function emptyValues(): GoalFormValues {
  return { title: '', description: '', targetDate: '', progress: 0, completed: false };
}

function goalToValues(goal: PlannerGoal): GoalFormValues {
  return {
    title: goal.title,
    description: goal.description ?? '',
    targetDate: goal.target_date ?? '',
    progress: goal.progress,
    completed: goal.completed,
  };
}

export function NewGoalDialog() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<GoalFormValues>(emptyValues());

  useEffect(() => {
    if (open) setValues(emptyValues());
  }, [open]);

  return (
    <GoalFormDialog
      mode="create"
      open={open}
      onOpenChange={setOpen}
      values={values}
      onValuesChange={setValues}
      trigger={
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New goal
        </Button>
      }
    />
  );
}

interface GoalFormDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: GoalFormValues;
  onValuesChange: (values: GoalFormValues) => void;
  trigger?: React.ReactNode;
  goal?: PlannerGoal;
}

export function GoalFormDialog({
  mode,
  open,
  onOpenChange,
  values,
  onValuesChange,
  trigger,
  goal,
}: GoalFormDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit';
  const update = (patch: Partial<GoalFormValues>) =>
    onValuesChange({ ...values, ...patch });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = values.title.trim();
    if (!trimmed) return;

    const payload = {
      title: trimmed,
      description: values.description.trim() || null,
      target_date: values.targetDate || null,
      progress: values.progress,
      completed: values.completed,
    };

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSubmitting(false);
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    const result = isEdit
      ? await supabase.from('planner_goals').update(payload).eq('id', goal!.id)
      : await supabase.from('planner_goals').insert(payload);
    setSubmitting(false);

    if (result.error) {
      toast.error(
        isEdit ? 'Could not update goal' : 'Could not create goal',
        { description: result.error.message }
      );
      return;
    }
    onOpenChange(false);
    toast.success(isEdit ? 'Goal updated' : 'Goal created');
    window.dispatchEvent(new Event(PLANNER_GOALS_CHANGED));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit goal' : 'New goal'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the details of your goal.'
                : 'Set a goal and track your progress toward it.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Title</Label>
              <Input
                id="goal-title"
                value={values.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="What do you want to achieve?"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-description">Description (optional)</Label>
              <Textarea
                id="goal-description"
                value={values.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Add any details about this goal"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-target-date">Target date (optional)</Label>
              <Input
                id="goal-target-date"
                type="date"
                value={values.targetDate}
                onChange={(e) => update({ targetDate: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="goal-progress">Progress</Label>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {values.progress}%
                </span>
              </div>
              <Slider
                id="goal-progress"
                value={[values.progress]}
                onValueChange={([v]) => update({ progress: v })}
                min={0}
                max={100}
                step={1}
              />
              <Progress value={values.progress} className="h-2" />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <Checkbox
                id="goal-completed"
                checked={values.completed}
                onCheckedChange={(c) => update({ completed: c === true })}
              />
              <Label htmlFor="goal-completed" className="text-sm font-normal">
                Mark as completed
              </Label>
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
                : 'Add goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { goalToValues, emptyValues };
