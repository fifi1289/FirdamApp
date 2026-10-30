'use client';

import { useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { addAmountsToShopping } from '@/features/recipes/recipe-actions';
import { haveItChange } from '@/features/meals/have-it';
import type { IngredientCheck } from '@/features/meals/pantry-check';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { tr, trn } from '@/lib/i18n';

/**
 * "+ to buy" and "I have it" for an ingredient the pantry doesn't cover,
 * the same two buttons as the phone app.
 */
export function IngredientActions({
  check,
  onPantryChange,
  className,
}: {
  check: IngredientCheck;
  /** Called after "I have it" so the page can reload the pantry. */
  onPantryChange?: () => void;
  className?: string;
}) {
  const [busy, setBusy] = useState<'buy' | 'have' | null>(null);
  const [onList, setOnList] = useState(false);
  if (check.status === 'available') return null;
  const line = check.line;
  const label = line.status === 'short' ? 'not enough' : line.status === 'staple-low' ? 'running low' : 'to buy';

  const buy = async () => {
    if (busy || onList) return;
    setBusy('buy');
    try {
      const item = line.shortfall ?? { name: line.need.name, quantity: line.scaled, unit: line.need.unit };
      await addAmountsToShopping([{ name: item.name, quantity: item.quantity, unit: item.unit }], 'From a recipe');
      setOnList(true);
      toast.success(tr('{0} added to Shopping', [item.name]));
    } catch (err) {
      toast.error(tr('Could not add it to Shopping'), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const have = async () => {
    if (busy) return;
    setBusy('have');
    try {
      const supabase = createSupabaseBrowserClient();
      const change = haveItChange(line);
      const { error } =
        change.kind === 'update'
          ? await supabase.from('pantry_items').update(change.patch).eq('id', change.id)
          : await supabase.from('pantry_items').insert(change.row);
      if (error) throw error;
      toast.success(tr('{0} added to your pantry', [line.need.name]));
      onPantryChange?.();
    } catch (err) {
      toast.error(tr('Could not add it to the pantry'), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  return (
    <span className={cn('flex shrink-0 items-center gap-1.5 print:hidden', className)}>
      <button
        type="button"
        onClick={buy}
        disabled={!!busy || onList}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition-colors',
          onList
            ? 'border-border bg-muted text-muted-foreground'
            : 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10'
        )}
        aria-label={onList ? tr('{0} is on your shopping list', [line.need.name]) : tr('Add {0} to Shopping', [line.need.name])}
      >
        {busy === 'buy' ? <Loader2 className="h-3 w-3 animate-spin" /> : onList ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        {onList ? tr('On list') : trn(label)}
      </button>
      <button
        type="button"
        onClick={have}
        disabled={!!busy}
        className="inline-flex items-center gap-1 rounded-lg border border-brand-sage/30 bg-brand-sage/10 px-2 py-0.5 text-[11px] font-semibold text-brand-sage transition-colors hover:bg-brand-sage/20"
        aria-label={tr('I have {0}', [line.need.name])}
      >
        {busy === 'have' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {tr('I have it')}
      </button>
    </span>
  );
}
