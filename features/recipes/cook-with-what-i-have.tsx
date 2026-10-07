'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, Plus, Refrigerator, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MealImage } from '@/features/meals/meal-image';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchRecipeIngredientIndex, formatDuration, totalMinutes, type RecipeSummary } from '@/features/recipes/recipe-api';
import { matchRecipes, parseHaveList } from '@/features/recipes/pantry-match';
import { addNamesToShopping } from '@/features/recipes/recipe-actions';

/**
 * Finds recipes you can make from what you have — your pantry plus anything
 * you type. Free for everyone: plain matching, no AI.
 */
export function CookWithWhatIHave({ recipes }: { recipes: RecipeSummary[] }) {
  const [index, setIndex] = useState<Map<string, { name: string; optional: boolean }[]> | null>(null);
  const [pantry, setPantry] = useState<string[]>([]);
  const [usePantry, setUsePantry] = useState(true);
  const [extra, setExtra] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      fetchRecipeIngredientIndex(),
      supabase.from('pantry_items').select('name').gt('quantity', 0),
    ]).then(([idx, { data }]) => {
      setIndex(idx);
      setPantry(Array.from(new Set((data ?? []).map((p) => p.name.trim()).filter(Boolean))));
    });
  }, []);

  const addExtra = () => {
    const items = parseHaveList(input);
    if (!items.length) return;
    setExtra((cur) => Array.from(new Set([...cur, ...items])));
    setInput('');
  };

  const have = useMemo(() => [...(usePantry ? pantry : []), ...extra], [usePantry, pantry, extra]);
  const byKey = useMemo(() => new Map(recipes.map((r) => [r.key, r])), [recipes]);
  const matches = useMemo(
    () => (index ? matchRecipes(index, have).filter((m) => byKey.has(m.key)).slice(0, 24) : []),
    [index, have, byKey]
  );

  const addMissing = async (recipe: RecipeSummary, missing: string[]) => {
    setAdding(recipe.key);
    try {
      const n = await addNamesToShopping(missing, `For ${recipe.name}`);
      toast.success(`Added ${n} item${n === 1 ? '' : 's'} to Shopping`);
    } catch {
      toast.error('Could not add to your shopping list');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Refrigerator className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">What can I cook?</p>
              <p className="text-sm text-muted-foreground">
                Tell us what you have and we’ll find halal recipes you can make now — or with just a few extra items.
                Salt, oil and other basics are assumed.
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              addExtra();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. chicken, tomato, eggs, potato"
              aria-label="Ingredients you have"
            />
            <Button type="submit" className="shrink-0" disabled={!input.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </form>

          {(extra.length > 0 || pantry.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {extra.map((x) => (
                <span key={x} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  {x}
                  <button
                    type="button"
                    onClick={() => setExtra((cur) => cur.filter((c) => c !== x))}
                    aria-label={`Remove ${x}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {pantry.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUsePantry((v) => !v)}
                  className={
                    usePantry
                      ? 'inline-flex items-center gap-1 rounded-full bg-brand-sage/15 px-2.5 py-1 text-xs text-brand-sage'
                      : 'inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground line-through'
                  }
                >
                  {usePantry && <Check className="h-3 w-3" />}
                  {pantry.length} item{pantry.length === 1 ? '' : 's'} from my pantry
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!index ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ingredients…
        </p>
      ) : have.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Add a few ingredients above, or{' '}
          <Link href="/dashboard/pantry" className="text-primary hover:underline">
            fill your pantry
          </Link>{' '}
          so we can suggest recipes automatically.
        </p>
      ) : matches.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No recipes match yet — try adding a main ingredient like chicken, lamb, lentils or rice.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map((m) => {
            const r = byKey.get(m.key)!;
            return (
              <Card key={m.key} className="flex flex-col overflow-hidden">
                <Link href={`/dashboard/recipes/${r.key}`} className="block">
                  <MealImage src={r.image} alt={r.name} category={r.mealType} className="h-36 w-full object-cover" />
                </Link>
                <CardContent className="flex flex-1 flex-col gap-2 p-4">
                  <Link href={`/dashboard/recipes/${r.key}`} className="font-semibold text-foreground hover:text-primary">
                    {r.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {[r.cuisine, formatDuration(totalMinutes(r))].filter(Boolean).join(' · ')}
                  </p>
                  {m.missing.length === 0 ? (
                    <p className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-sage/15 px-2.5 py-1 text-xs font-medium text-brand-sage">
                      <Check className="h-3 w-3" /> You have everything
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Missing:</span> {m.missing.join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">You have:</span> {m.have.join(', ')}
                  </p>
                  {m.missing.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto w-fit"
                      disabled={adding === r.key}
                      onClick={() => addMissing(r, m.missing)}
                    >
                      {adding === r.key ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="mr-2 h-4 w-4" />
                      )}
                      Add missing to Shopping
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
