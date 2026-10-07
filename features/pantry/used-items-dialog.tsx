'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Minus, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatAmount } from '@/lib/pantry/units';
import { applyPantryChanges, type PantryChange } from '@/lib/pantry/store';
import { undoToast } from '@/features/pantry/cook-dialog';
import type { PantryItem } from '@/types/database';
import { cn } from '@/lib/utils';

type Level = NonNullable<PantryItem['level']>;
type Choice = { kind: 'fraction'; value: number } | { kind: 'count'; value: number } | { kind: 'level'; value: Level };

const FRACTIONS: { label: string; value: number }[] = [
  { label: 'a little', value: 0.15 },
  { label: '¼', value: 0.25 },
  { label: '½', value: 0.5 },
  { label: 'all', value: 1 },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * For meals cooked "from your head": tap the pantry items you used and
 * roughly how much. No recipe needed.
 */
export function UsedItemsDialog({
  open,
  onOpenChange,
  planRef,
  mealType,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planRef?: string | null;
  mealType?: string | null;
  onDone?: () => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [pantry, setPantry] = useState<PantryItem[] | null>(null);
  const [picked, setPicked] = useState<Record<string, Choice>>({});
  const [query, setQuery] = useState('');
  const [dish, setDish] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked({});
    setQuery('');
    setDish('');
    supabase
      .from('pantry_items')
      .select('*')
      .order('name')
      .then(({ data }) => setPantry((data ?? []) as PantryItem[]));
  }, [open, supabase]);

  const visible = (pantry ?? []).filter((p) => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()));

  const toggle = (item: PantryItem) =>
    setPicked((cur) => {
      const next = { ...cur };
      if (next[item.id]) delete next[item.id];
      else
        next[item.id] =
          item.tracking === 'level'
            ? { kind: 'level', value: item.level === 'full' ? 'half' : 'low' }
            : item.unit === 'Pieces'
              ? { kind: 'count', value: 1 }
              : { kind: 'fraction', value: 0.5 };
      return next;
    });

  const confirm = async () => {
    if (!pantry) return;
    setSaving(true);
    try {
      const changes: PantryChange[] = [];
      for (const item of pantry) {
        const p = picked[item.id];
        if (!p) continue;
        if (p.kind === 'level') {
          changes.push({ kind: 'update', item, patch: { level: p.value } });
          continue;
        }
        const q = Number(item.quantity) || 0;
        const left = p.kind === 'count' ? q - p.value : q * (1 - p.value);
        changes.push(left <= 0.0001 ? { kind: 'delete', item } : { kind: 'update', item, patch: { quantity: +left.toFixed(3) } });
      }
      const label = dish.trim() ? `Cooked ${dish.trim()}` : 'Cooked something else';
      const batchId = await applyPantryChanges(changes, 'cooked', label);
      await supabase.from('cooking_log').insert({
        cooked_on: todayISO(),
        meal_type: mealType ?? null,
        status: 'other',
        recipe_name: dish.trim() || null,
        plan_ref: planRef ?? null,
        batch_id: batchId,
      });
      window.dispatchEvent(new Event('pantry-items-changed'));
      window.dispatchEvent(new Event('cooking-log-changed'));
      onOpenChange(false);
      onDone?.();
      undoToast(`Pantry updated (${changes.length} item${changes.length === 1 ? '' : 's'})`, batchId, () =>
        window.dispatchEvent(new Event('cooking-log-changed'))
      );
    } catch (err) {
      toast.error('Could not update your pantry', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const count = Object.keys(picked).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>What did you use?</DialogTitle>
          <DialogDescription>Tap the things you cooked with and roughly how much. We’ll update your pantry.</DialogDescription>
        </DialogHeader>

        <Input value={dish} onChange={(e) => setDish(e.target.value)} placeholder="What did you make? (optional)" aria-label="Dish name" />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your pantry" className="pl-9" aria-label="Search pantry" />
        </div>

        {!pantry ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your pantry…
          </p>
        ) : pantry.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Your pantry is empty, so there’s nothing to take off.</p>
        ) : (
          <ul className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-1">
            {visible.map((item) => {
              const p = picked[item.id];
              return (
                <li key={item.id} className={cn('rounded-xl border px-3 py-2', p ? 'border-primary/50 bg-primary/5' : 'border-border')}>
                  <button type="button" onClick={() => toggle(item)} className="flex w-full items-center justify-between gap-2 text-left">
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.tracking === 'level' ? item.level ?? 'full' : formatAmount(Number(item.quantity), item.unit)}
                    </span>
                  </button>
                  {p && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {p.kind === 'count' && (
                        <>
                          <span className="mr-1 text-xs text-muted-foreground">Used</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPicked((c) => ({ ...c, [item.id]: { kind: 'count', value: Math.max(1, p.value - 1) } }))} aria-label="Fewer">
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">{p.value}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPicked((c) => ({ ...c, [item.id]: { kind: 'count', value: Math.min(Number(item.quantity) || 1, p.value + 1) } }))} aria-label="More">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {p.kind === 'fraction' &&
                        FRACTIONS.map((f) => (
                          <button
                            key={f.label}
                            type="button"
                            onClick={() => setPicked((c) => ({ ...c, [item.id]: { kind: 'fraction', value: f.value } }))}
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs',
                              p.value === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      {p.kind === 'level' && (
                        <>
                          <span className="mr-1 text-xs text-muted-foreground">Now</span>
                          {(['full', 'half', 'low', 'out'] as Level[]).map((l) => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setPicked((c) => ({ ...c, [item.id]: { kind: 'level', value: l } }))}
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-xs capitalize',
                                p.value === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {l}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={saving || count === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Update {count || ''} item{count === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
