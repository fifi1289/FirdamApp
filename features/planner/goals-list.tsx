'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  Target,
  CalendarDays,
  Trophy,
} from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PlannerGoal } from '@/types/database';
import {
  GoalFormDialog,
  goalToValues,
  emptyValues,
  type GoalFormValues,
} from '@/features/planner/goal-form-dialog';

export const PLANNER_GOALS_CHANGED = 'planner-goals-changed';

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function GoalCard({
  goal,
  onProgress,
  onToggle,
  onEdit,
  onDelete,
  variant = 'full',
}: {
  goal: PlannerGoal;
  onProgress: (goal: PlannerGoal, progress: number) => void;
  onToggle: (goal: PlannerGoal) => void;
  onEdit: (goal: PlannerGoal) => void;
  onDelete: (goal: PlannerGoal) => void;
  variant?: 'full' | 'compact';
}) {
  const target = formatDate(goal.target_date);

  return (
    <div
      className={cn(
        'group rounded-xl border border-border/60 p-4 transition-colors',
        goal.completed
          ? 'bg-muted/30'
          : 'bg-card hover:border-border'
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={goal.completed}
          onCheckedChange={() => onToggle(goal)}
          aria-label="Toggle goal completed"
          className="mt-0.5 h-5 w-5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm font-semibold',
                goal.completed
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}
            >
              {goal.title}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-medium',
                  goal.completed
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-border text-muted-foreground'
                )}
              >
                {goal.completed ? 'Completed' : 'Active'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Goal actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(goal)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onDelete(goal)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {variant === 'full' && goal.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {goal.description}
            </p>
          )}

          {target && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {target}
            </p>
          )}

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Progress
                value={goal.progress}
                className={cn('h-2', goal.completed && 'opacity-60')}
              />
              <span className="ml-3 w-10 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                {goal.progress}%
              </span>
            </div>
            {!goal.completed && (
              <Slider
                value={[goal.progress]}
                onValueChange={([v]) => onProgress(goal, v)}
                min={0}
                max={100}
                step={1}
                aria-label="Update progress"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoalsList({ limit }: { limit?: number }) {
  const supabase = createSupabaseBrowserClient();
  const [goals, setGoals] = useState<PlannerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<PlannerGoal | null>(null);
  const [editValues, setEditValues] = useState<GoalFormValues>(emptyValues());
  const [editOpen, setEditOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<PlannerGoal | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAchieved, setShowAchieved] = useState(false);

  const loadGoals = useCallback(async () => {
    const { data, error } = await supabase
      .from('planner_goals')
      .select('*')
      .order('completed', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load goals:', error.message);
    }
    setGoals(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadGoals();
    const handler = () => loadGoals();
    window.addEventListener(PLANNER_GOALS_CHANGED, handler);
    return () => window.removeEventListener(PLANNER_GOALS_CHANGED, handler);
  }, [loadGoals]);

  const patchGoal = (id: string, patch: Partial<PlannerGoal>) =>
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g))
    );

  const updateProgress = async (goal: PlannerGoal, progress: number) => {
    patchGoal(goal.id, {
      progress,
      completed: progress >= 100 ? true : false,
    });
    const { error } = await supabase
      .from('planner_goals')
      .update({ progress, completed: progress >= 100 })
      .eq('id', goal.id);
    if (error) {
      patchGoal(goal.id, { progress: goal.progress, completed: goal.completed });
    }
  };

  const toggleGoal = async (goal: PlannerGoal) => {
    const next = !goal.completed;
    patchGoal(goal.id, { completed: next, progress: next ? 100 : goal.progress });
    const { error } = await supabase
      .from('planner_goals')
      .update({ completed: next, progress: next ? 100 : goal.progress })
      .eq('id', goal.id);
    if (error) {
      patchGoal(goal.id, { completed: goal.completed, progress: goal.progress });
    }
  };

  const startEdit = (goal: PlannerGoal) => {
    setEditingGoal(goal);
    setEditValues(goalToValues(goal));
    setEditOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingGoal) return;
    const id = deletingGoal.id;
    setDeleting(true);
    const { error } = await supabase.from('planner_goals').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      console.error('Failed to delete goal:', error.message);
      return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setDeleteOpen(false);
    setDeletingGoal(null);
    toast.success('Goal deleted');
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  const isHome = !!limit;
  const visibleActive = isHome && !showAllActive
    ? activeGoals.slice(0, limit)
    : activeGoals;
  const hasMoreActive = isHome && activeGoals.length > limit;

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading goals…
            </p>
          ) : goals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No goals yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Create your first goal to start tracking your progress.
                </p>
              </div>
            </div>
          ) : (
            <>
              {visibleActive.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onProgress={updateProgress}
                  onToggle={toggleGoal}
                  onEdit={startEdit}
                  onDelete={(g) => {
                    setDeletingGoal(g);
                    setDeleteOpen(true);
                  }}
                  variant="compact"
                />
              ))}

              {hasMoreActive && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAllActive((v) => !v)}
                >
                  {showAllActive ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Show fewer goals
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      View all goals
                    </>
                  )}
                </Button>
              )}

              {activeGoals.length === 0 && completedGoals.length > 0 && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                  <p className="text-sm font-medium text-foreground">
                    You&apos;re all caught up.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All your goals are complete.
                  </p>
                </div>
              )}

              {completedGoals.length > 0 && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setShowAchieved((v) => !v)}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Achieved
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium"
                      >
                        {completedGoals.length}
                      </Badge>
                    </span>
                    {showAchieved ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  {showAchieved && (
                    <div className="mt-2 space-y-3">
                      {completedGoals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          onProgress={updateProgress}
                          onToggle={toggleGoal}
                          onEdit={startEdit}
                          onDelete={(g) => {
                            setDeletingGoal(g);
                            setDeleteOpen(true);
                          }}
                          variant="compact"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <GoalFormDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        values={editValues}
        onValuesChange={setEditValues}
        goal={editingGoal ?? undefined}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingGoal
                ? `"${deletingGoal.title}" will be permanently removed.`
                : 'This goal will be permanently removed.'}{' '}
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
    </>
  );
}
