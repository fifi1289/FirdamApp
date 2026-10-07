'use client';

import { useEffect, useState } from 'react';
import { Loader2, MoreHorizontal, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SavingsGoal, SavingsGoalKind } from '@/types/database';
import { GOAL_KINDS, formatMoney } from '@/features/budget/budget-config';
import { usePlan } from '@/lib/plan/plan';
import { UpgradeDialog, UsageNote } from '@/components/plan/upgrade-prompt';

function monthsUntil(date: string | null): number | null {
  if (!date) return null;
  const [y, m] = date.split('-').map(Number);
  const now = new Date();
  const months = (y! - now.getFullYear()) * 12 + (m! - 1 - now.getMonth());
  return Math.max(0, months);
}

function GoalDialog({
  open,
  onOpenChange,
  goal,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  goal: SavingsGoal | null;
  onSaved: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<SavingsGoalKind>('hajj');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? '');
    setKind(goal?.kind ?? 'hajj');
    setTarget(goal ? String(goal.target) : '');
    setSaved(goal ? String(goal.saved) : '');
    setDate(goal?.target_date ?? '');
  }, [open, goal]);

  const save = async () => {
    const t = Number(target);
    const s = Number(saved || 0);
    const label = name.trim() || GOAL_KINDS.find((k) => k.value === kind)?.label || 'Goal';
    if (!Number.isFinite(t) || t <= 0) {
      toast.error('Enter a target amount.');
      return;
    }
    setBusy(true);
    const row = {
      name: label,
      kind,
      target: t,
      saved: Number.isFinite(s) && s > 0 ? s : 0,
      target_date: date || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = goal
      ? await supabase.from('savings_goals').update(row).eq('id', goal.id)
      : await supabase.from('savings_goals').insert(row);
    setBusy(false);
    if (error) {
      toast.error('Could not save goal', { description: error.message });
      return;
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit goal' : 'New savings goal'}</DialogTitle>
          <DialogDescription>Save steadily for what matters — Hajj, Eid, education and more.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as SavingsGoalKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.emoji} {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Name</Label>
              <Input
                id="goal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={GOAL_KINDS.find((k) => k.value === kind)?.label}
                maxLength={80}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target</Label>
              <Input id="goal-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-saved">Saved so far</Label>
              <Input id="goal-saved" inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Target date (optional)</Label>
            <Input id="goal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SavingsGoals({ currency }: { currency: string }) {
  const supabase = createSupabaseBrowserClient();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contribution, setContribution] = useState<Record<string, string>>({});
  const { atLimit, limit } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) console.error('Failed to load goals:', error.message);
    setGoals(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contribute = async (goal: SavingsGoal) => {
    const amount = Number(contribution[goal.id] ?? '');
    if (!Number.isFinite(amount) || amount === 0) return;
    const saved = Math.max(0, Number(goal.saved) + amount);
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, saved } : g)));
    setContribution((c) => ({ ...c, [goal.id]: '' }));
    const { error } = await supabase
      .from('savings_goals')
      .update({ saved, updated_at: new Date().toISOString() })
      .eq('id', goal.id);
    if (error) {
      toast.error('Could not update goal');
      load();
    } else if (saved >= Number(goal.target) && Number(goal.saved) < Number(goal.target)) {
      toast.success(`MashaAllah — you reached your ${goal.name} goal!`);
    }
  };

  const remove = async (goal: SavingsGoal) => {
    if (!window.confirm(`Delete the goal "${goal.name}"?`)) return;
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    const { error } = await supabase.from('savings_goals').delete().eq('id', goal.id);
    if (error) {
      toast.error('Could not delete goal');
      load();
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Put a little aside each month and watch it grow.
        </p>
        <Button
          size="sm"
          onClick={() => {
            if (atLimit('savingsGoals', goals.length)) {
              setUpgradeOpen(true);
              return;
            }
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New goal
        </Button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading goals…
        </p>
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PiggyBank className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-foreground">No savings goals yet</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Saving for Hajj, Umrah, Eid gifts or your children&apos;s education? Create a goal to
              track it.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const kind = GOAL_KINDS.find((k) => k.value === g.kind) ?? GOAL_KINDS[GOAL_KINDS.length - 1]!;
            const pct = Math.min(100, Math.round((Number(g.saved) / Number(g.target)) * 100));
            const months = monthsUntil(g.target_date);
            const left = Math.max(0, Number(g.target) - Number(g.saved));
            const perMonth = months && months > 0 ? left / months : null;
            return (
              <Card key={g.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-xl">
                        {kind.emoji}
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(Number(g.saved), currency)} of {formatMoney(Number(g.target), currency)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Goal actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(g);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => remove(g)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Progress value={pct} className="mt-4 h-2.5" />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{pct}%</span>
                    <span>
                      {pct >= 100
                        ? 'Goal reached'
                        : perMonth
                          ? `${formatMoney(perMonth, currency)}/month to reach it`
                          : `${formatMoney(left, currency)} to go`}
                    </span>
                  </div>
                  {pct < 100 && (
                    <form
                      className="mt-4 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        contribute(g);
                      }}
                    >
                      <Input
                        inputMode="decimal"
                        placeholder="Add savings"
                        value={contribution[g.id] ?? ''}
                        onChange={(e) => setContribution((c) => ({ ...c, [g.id]: e.target.value }))}
                        className="h-9"
                      />
                      <Button type="submit" size="sm" variant="secondary" className="h-9">
                        Add
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {goals.length > 0 && (
        <div className="mt-4">
          <UsageNote
            used={goals.length}
            limit={limit('savingsGoals')}
            label="savings goals"
            onUpgrade={() => setUpgradeOpen(true)}
          />
        </div>
      )}
      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} goal={editing} onSaved={load} />
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} limitKey="savingsGoals" />
    </>
  );
}
