'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Utensils } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { normalizePlan, formatWeekRange } from '@/features/meals/meal-plan-generator';
import {
  formatQuantityWithUnit,
  getPlanPantrySummary,
  type MissingIngredient,
} from '@/features/meals/pantry-check';
import { guessCategory } from '@/features/groceries/grocery-utils';
import type { GroceryItem } from '@/types/database';

interface FromMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string | null;
  existingItems: GroceryItem[];
  onAdded: () => void;
}

export function FromMealPlanDialog({
  open,
  onOpenChange,
  listId,
  existingItems,
  onAdded,
}: FromMealPlanDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planLabel, setPlanLabel] = useState<string | null>(null);
  const [missing, setMissing] = useState<MissingIngredient[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [noPlan, setNoPlan] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNoPlan(false);
      const [{ data: plans, error: planError }, { data: pantry }] = await Promise.all([
        supabase
          .from('meal_plans')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('pantry_items').select('*'),
      ]);
      if (cancelled) return;
      if (planError || !plans || plans.length === 0) {
        setNoPlan(true);
        setMissing([]);
        setLoading(false);
        return;
      }
      const record = plans[0]!;
      const plan = normalizePlan(record.plan_data as Record<string, unknown>);
      const summary = getPlanPantrySummary(plan, pantry ?? []);
      const already = new Set(existingItems.map((i) => i.name.trim().toLowerCase()));
      const list = summary.missingIngredients.filter(
        (m) => !already.has(m.name.trim().toLowerCase())
      );
      setPlanLabel(plan.weekStartDate ? formatWeekRange(plan.weekStartDate) : record.name);
      setMissing(list);
      setSelected(new Set(list.map((m) => m.name)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase, existingItems]);

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const add = async () => {
    if (!listId) return;
    const rows = missing
      .filter((m) => selected.has(m.name))
      .map((m) => ({
        list_id: listId,
        name: m.name,
        quantity: m.missingQuantity > 0 ? Math.round(m.missingQuantity * 100) / 100 : null,
        unit: m.missingUnit || null,
        category: guessCategory(m.name),
        from_meal_plan: true,
        note: m.meals.length ? `For ${m.meals.slice(0, 2).join(', ')}${m.meals.length > 2 ? '…' : ''}` : null,
      }));
    if (rows.length === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('grocery_items').insert(rows);
    setSaving(false);
    if (error) {
      toast.error('Could not add items', { description: error.message });
      return;
    }
    toast.success(`Added ${rows.length} item${rows.length === 1 ? '' : 's'} from your meal plan`);
    onAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add from your meal plan</DialogTitle>
          <DialogDescription>
            {planLabel
              ? `Ingredients for ${planLabel} that aren't already in your pantry.`
              : 'Ingredients from your latest meal plan that you still need.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your plan against the pantry…
          </div>
        ) : noPlan ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Utensils className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">No meal plan yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Create a halal meal plan first, then come back to turn it into a grocery list.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/dashboard/meals">Plan meals</Link>
            </Button>
          </div>
        ) : missing.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Alhamdulillah — you already have everything for this plan.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{selected.size} of {missing.length} selected</span>
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() =>
                  setSelected(
                    selected.size === missing.length ? new Set() : new Set(missing.map((m) => m.name))
                  )
                }
              >
                {selected.size === missing.length ? 'Select none' : 'Select all'}
              </button>
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {missing.map((m) => (
                <li key={m.name}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/50">
                    <Checkbox
                      checked={selected.has(m.name)}
                      onCheckedChange={() => toggle(m.name)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium capitalize text-foreground">{m.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatQuantityWithUnit(m.missingQuantity, m.missingUnit)}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.meals.join(', ')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!noPlan && missing.length > 0 && (
            <Button onClick={add} disabled={saving || selected.size === 0 || !listId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {selected.size} item{selected.size === 1 ? '' : 's'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
