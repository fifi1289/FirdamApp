'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChefHat, Loader2, Minus, Plus, Refrigerator, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MealImage } from '@/features/meals/meal-image';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchRecipeNeeds, formatDuration, totalMinutes, type RecipeNeeds, type RecipeSummary } from '@/features/recipes/recipe-api';
import { parseHaveList } from '@/features/recipes/pantry-match';
import { addAmountsToShopping } from '@/features/recipes/recipe-actions';
import { checkNeeds, type PantryLike, type RecipeCheck } from '@/lib/pantry/engine';
import { formatAmount, isBasic, matchScore } from '@/lib/pantry/units';
import { formatPortions, useHousehold } from '@/lib/pantry/portions';
import { CookDialog } from '@/features/pantry/cook-dialog';
import type { PantryItem } from '@/types/database';

interface Match {
  recipe: RecipeSummary;
  needs: RecipeNeeds;
  check: RecipeCheck;
  usesExpiring: boolean;
}

/**
 * "What can I cook?": recipes the family can make with what's at home, for
 * the right number of portions — and exactly what's missing for the rest.
 * Free for everyone: no AI.
 */
export function CookWithWhatIHave({ recipes }: { recipes: RecipeSummary[] }) {
  const { household } = useHousehold();
  const [needs, setNeeds] = useState<Map<string, RecipeNeeds> | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [usePantry, setUsePantry] = useState(true);
  const [extra, setExtra] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [portions, setPortions] = useState<number | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [cooking, setCooking] = useState<Match | null>(null);

  const loadPantry = () =>
    createSupabaseBrowserClient()
      .from('pantry_items')
      .select('*')
      .then(({ data }) => setPantry((data ?? []) as PantryItem[]));

  useEffect(() => {
    fetchRecipeNeeds().then(setNeeds);
    loadPantry();
    const h = () => loadPantry();
    window.addEventListener('pantry-items-changed', h);
    return () => window.removeEventListener('pantry-items-changed', h);
  }, []);

  useEffect(() => {
    if (household && portions == null) setPortions(household.portions);
  }, [household, portions]);

  const addExtra = () => {
    const items = parseHaveList(input);
    if (!items.length) return;
    setExtra((cur) => Array.from(new Set([...cur, ...items])));
    setInput('');
  };

  const stock: PantryLike[] = useMemo(() => {
    const base = usePantry ? (pantry as PantryLike[]) : [];
    // Typed items: "you have some" — amounts aren't known, so they count as enough.
    const typed = extra.map((name, i) => ({ id: `typed-${i}`, name, quantity: 1, unit: 'Pack' }));
    return [...base, ...typed];
  }, [usePantry, pantry, extra]);

  const expiringSoon = useMemo(() => {
    const soon = Date.now() + 4 * 24 * 3600 * 1000;
    return pantry.filter((p) => p.expiration_date && new Date(p.expiration_date).getTime() <= soon);
  }, [pantry]);

  const p = portions ?? household?.portions ?? 4;

  const matches = useMemo(() => {
    if (!needs || stock.length === 0) return { ready: [] as Match[], almost: [] as Match[] };
    const all: Match[] = [];
    for (const recipe of recipes) {
      const n = needs.get(recipe.key);
      if (!n || n.ingredients.length === 0) continue;
      const check = checkNeeds(n.ingredients, stock, { factor: p / (n.servings || p) });
      // Must use at least one real ingredient you have (not just salt and spices).
      const usesSomething = check.lines.some((l) => l.item && !isBasic(l.need.name));
      if (!usesSomething || check.verdict === 'far') continue;
      const usesExpiring = expiringSoon.some((e) => n.ingredients.some((i) => matchScore(e.name, i.name) >= 2));
      all.push({ recipe, needs: n, check, usesExpiring });
    }
    const score = (m: Match) => (m.usesExpiring ? -1 : 0) + m.check.missingCount * 2 + m.check.shortCount;
    all.sort((a, b) => score(a) - score(b));
    return { ready: all.filter((m) => m.check.verdict === 'ready').slice(0, 24), almost: all.filter((m) => m.check.verdict === 'almost').slice(0, 24) };
  }, [needs, stock, recipes, p, expiringSoon]);

  const toShopping = async (m: Match) => {
    const items = m.check.lines.filter((l) => l.shortfall).map((l) => l.shortfall!);
    setAdding(m.recipe.key);
    try {
      const n = await addAmountsToShopping(items, `For ${m.recipe.name}`);
      toast.success(`Added ${n} item${n === 1 ? '' : 's'} to Shopping`);
    } catch {
      toast.error('Could not add to your shopping list');
    } finally {
      setAdding(null);
    }
  };

  const card = (m: Match) => {
    const r = m.recipe;
    const gaps = m.check.lines.filter((l) => l.status === 'missing' || l.status === 'short');
    const low = m.check.lines.filter((l) => l.status === 'staple-low');
    return (
      <Card key={r.key} className="flex flex-col overflow-hidden">
        <Link href={`/dashboard/recipes/${r.key}`} className="block">
          <MealImage src={r.image} alt={r.name} category={r.mealType} className="h-36 w-full object-cover" />
        </Link>
        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <Link href={`/dashboard/recipes/${r.key}`} className="font-semibold text-foreground hover:text-primary">
            {r.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {[r.cuisine, formatDuration(totalMinutes(r))].filter(Boolean).join(' · ')}
            {m.usesExpiring && <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">· uses food expiring soon</span>}
          </p>
          {gaps.length === 0 ? (
            <p className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-sage/15 px-2.5 py-1 text-xs font-medium text-brand-sage">
              <Check className="h-3 w-3" /> You have enough for {formatPortions(p)}
            </p>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {gaps.map((g, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Buy {g.shortfall?.quantity != null ? formatAmount(g.shortfall.quantity, g.shortfall.unit) + ' ' : ''}
                    {g.need.name}
                  </span>
                  {g.status === 'short' && <> — you have {g.haveText}, need {g.neededText}</>}
                </li>
              ))}
            </ul>
          )}
          {low.length > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">Running low: {low.map((l) => l.item?.name).join(', ')}</p>}
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {gaps.length === 0 ? (
              <Button size="sm" onClick={() => setCooking(m)}>
                <ChefHat className="mr-2 h-4 w-4" /> I cooked this
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled={adding === r.key} onClick={() => toShopping(m)}>
                {adding === r.key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                Add missing to Shopping
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Refrigerator className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">What can I cook?</p>
                <p className="text-sm text-muted-foreground">
                  Checks your pantry amounts against each recipe, scaled to your family. Salt, oil, spices and other basics
                  are assumed.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl bg-muted px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Cooking for</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPortions(Math.max(1, p - 0.5))} aria-label="Fewer portions">
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{formatPortions(p)}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPortions(p + 0.5)} aria-label="More portions">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {household && household.children > 0 && (
            <p className="text-xs text-muted-foreground">
              {household.people} people · children count as ¾ (6–12) or ½ (under 6) of a portion. Change ages in Family.
            </p>
          )}

          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              addExtra();
            }}
          >
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Anything not in your pantry? e.g. chicken, tomato, eggs" aria-label="Ingredients you have" />
            <Button type="submit" className="shrink-0" disabled={!input.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            {extra.map((x) => (
              <span key={x} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                {x}
                <button type="button" onClick={() => setExtra((cur) => cur.filter((c) => c !== x))} aria-label={`Remove ${x}`}>
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
            {pantry.length === 0 && (
              <Link href="/dashboard/pantry" className="text-xs text-primary hover:underline">
                Set up your pantry for exact suggestions →
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {!needs ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking recipes…
        </p>
      ) : stock.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Add a few ingredients above, or fill your pantry.</p>
      ) : matches.ready.length === 0 && matches.almost.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No recipes match yet — try adding a main ingredient like chicken, lamb, lentils or rice.
        </p>
      ) : (
        <>
          {matches.ready.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-base font-semibold text-foreground">Cook now ({matches.ready.length})</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{matches.ready.map(card)}</div>
            </section>
          )}
          {matches.almost.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-base font-semibold text-foreground">Almost — buy a few things ({matches.almost.length})</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{matches.almost.map(card)}</div>
            </section>
          )}
        </>
      )}

      <CookDialog
        recipe={
          cooking
            ? { key: cooking.recipe.key, name: cooking.recipe.name, servings: cooking.needs.servings, ingredients: cooking.needs.ingredients }
            : null
        }
        open={!!cooking}
        onOpenChange={(o) => !o && setCooking(null)}
        initialPortions={p}
      />
    </div>
  );
}
