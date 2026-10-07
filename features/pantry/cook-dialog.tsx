'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChefHat, Loader2, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { checkNeeds, deductionsFor, type Level, type Need, type PantryLike } from '@/lib/pantry/engine';
import { formatAmount } from '@/lib/pantry/units';
import { formatPortions, useHousehold } from '@/lib/pantry/portions';
import { applyPantryChanges, changesForDeductions, undoPantryBatch, type PantryChange } from '@/lib/pantry/store';
import type { PantryItem } from '@/types/database';

export interface CookableRecipe {
  /** "c-<uuid>" / "u-<uuid>" for library recipes, or a meal-plan meal id. */
  key: string | null;
  name: string;
  /** Servings the ingredient amounts are written for. */
  servings: number;
  ingredients: Need[];
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Shows an Undo toast for a pantry batch. */
export function undoToast(message: string, batchId: string, onUndone?: () => void) {
  toast.success(message, {
    duration: 8000,
    action: {
      label: 'Undo',
      onClick: async () => {
        try {
          await undoPantryBatch(batchId);
          window.dispatchEvent(new Event('pantry-items-changed'));
          toast.success('Undone — your pantry is back as it was');
          onUndone?.();
        } catch {
          toast.error('Could not undo');
        }
      },
    },
  });
}

/**
 * "I cooked this": shows what will come out of the pantry for the family's
 * portions, lets the cook adjust, and updates the pantry in one tap.
 */
export function CookDialog({
  recipe,
  open,
  onOpenChange,
  planRef,
  mealType,
  initialPortions,
  onDone,
}: {
  recipe: CookableRecipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planRef?: string | null;
  mealType?: string | null;
  initialPortions?: number;
  onDone?: () => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { household } = useHousehold();
  const [pantry, setPantry] = useState<PantryItem[] | null>(null);
  const [portions, setPortions] = useState(initialPortions ?? 4);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSkip(new Set());
    setLevels({});
    setPantry(null);
    supabase
      .from('pantry_items')
      .select('*')
      .then(({ data }) => setPantry((data ?? []) as PantryItem[]));
  }, [open, supabase]);

  useEffect(() => {
    if (open) setPortions(initialPortions ?? household?.portions ?? recipe?.servings ?? 4);
  }, [open, initialPortions, household, recipe]);

  const check = useMemo(() => {
    if (!recipe || !pantry) return null;
    return checkNeeds(recipe.ingredients, pantry as PantryLike[], { factor: portions / (recipe.servings || portions) });
  }, [recipe, pantry, portions]);

  const deductions = useMemo(() => (check ? deductionsFor(check) : []), [check]);
  const staples = useMemo(() => {
    if (!check) return [];
    const seen = new Set<string>();
    return check.lines
      .filter((l) => l.item?.tracking === 'level')
      .map((l) => l.item as PantryItem)
      .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  }, [check]);
  const missing = check?.lines.filter((l) => l.status === 'missing') ?? [];

  const confirm = async () => {
    if (!recipe) return;
    setSaving(true);
    try {
      const changes: PantryChange[] = changesForDeductions(
        deductions.filter((d) => !skip.has(d.item.id)) as unknown as { item: PantryItem; newQuantity: number }[]
      );
      for (const s of staples) {
        const lvl = levels[s.id];
        if (lvl && lvl !== s.level) changes.push({ kind: 'update', item: s, patch: { level: lvl } });
      }
      const batchId = await applyPantryChanges(changes, 'cooked', `Cooked ${recipe.name}`);
      await supabase.from('cooking_log').insert({
        cooked_on: todayISO(),
        meal_type: mealType ?? null,
        status: 'cooked',
        recipe_key: recipe.key,
        recipe_name: recipe.name,
        servings: portions,
        plan_ref: planRef ?? null,
        batch_id: batchId,
      });
      window.dispatchEvent(new Event('pantry-items-changed'));
      window.dispatchEvent(new Event('cooking-log-changed'));
      onOpenChange(false);
      onDone?.();
      undoToast(
        changes.length ? `Enjoy! ${changes.length} pantry item${changes.length === 1 ? '' : 's'} updated.` : 'Enjoy! Marked as cooked.',
        batchId,
        () => window.dispatchEvent(new Event('cooking-log-changed'))
      );
    } catch (err) {
      toast.error('Could not update your pantry', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" /> You cooked {recipe?.name}
          </DialogTitle>
          <DialogDescription>We’ll take what you used out of your pantry. Change anything that isn’t right.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
          <span className="text-sm text-foreground">Cooked for</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPortions((p) => Math.max(0.5, p - 0.5))} aria-label="Fewer portions">
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-24 text-center text-sm font-semibold tabular-nums text-foreground">
              {formatPortions(portions)} portion{portions === 1 ? '' : 's'}
            </span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPortions((p) => p + 0.5)} aria-label="More portions">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!check ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your pantry…
          </p>
        ) : (
          <div className="space-y-4">
            {deductions.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Taken from your pantry</p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {deductions.map((d) => (
                    <li key={d.item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Checkbox
                        checked={!skip.has(d.item.id)}
                        onCheckedChange={(v) =>
                          setSkip((cur) => {
                            const next = new Set(cur);
                            if (v) next.delete(d.item.id);
                            else next.add(d.item.id);
                            return next;
                          })
                        }
                        aria-label={`Take ${d.item.name} from pantry`}
                      />
                      <span className="flex-1 text-foreground">{d.item.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        −{formatAmount(d.use, d.item.unit)} ·{' '}
                        {d.newQuantity <= 0 ? <span className="text-destructive">finished</span> : `${formatAmount(d.newQuantity, d.item.unit)} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {staples.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cupboard staples used</p>
                <ul className="space-y-1.5">
                  {staples.map((s) => {
                    const current = levels[s.id] ?? s.level ?? 'full';
                    return (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-foreground">{s.name}</span>
                        <span className="flex gap-1">
                          {(['full', 'half', 'low', 'out'] as Level[]).map((l) => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setLevels((cur) => ({ ...cur, [s.id]: l }))}
                              className={
                                current === l
                                  ? 'rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium capitalize text-primary-foreground'
                                  : 'rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize text-muted-foreground hover:text-foreground'
                              }
                            >
                              {l}
                            </button>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {missing.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Not in your pantry, so nothing to take off: {missing.map((m) => m.need.name).join(', ')}.
              </p>
            )}
            {deductions.length === 0 && staples.length === 0 && (
              <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
                None of this recipe’s ingredients are tracked in your pantry yet. We’ll just mark it as cooked.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={saving || !check}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
