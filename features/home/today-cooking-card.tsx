'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChefHat, ClipboardCheck, MoreHorizontal, Utensils, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { normalizePlan, type MockMeal } from '@/features/meals/meal-plan-generator';
import { getMealTypeLabel } from '@/features/meals/meals-config';
import { CookDialog, type CookableRecipe } from '@/features/pantry/cook-dialog';
import { UsedItemsDialog } from '@/features/pantry/used-items-dialog';
import type { CookingLog } from '@/types/database';
import { cn } from '@/lib/utils';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface TodayMeal {
  meal: MockMeal;
  planRef: string;
}

function toCookable(meal: MockMeal): CookableRecipe {
  return {
    key: /^[0-9a-f-]{36}$/i.test(meal.id) ? `c-${meal.id}` : meal.id.startsWith('u-') ? meal.id : null,
    name: meal.name,
    servings: meal.servings || 4,
    ingredients: meal.ingredients.map((i) => {
      const q = parseFloat(i.quantity);
      return { name: i.name, quantity: Number.isFinite(q) && q > 0 ? q : null, unit: i.unit ?? '' };
    }),
  };
}

/**
 * Home card: "Did you cook today's meals?" — one tap updates the pantry.
 * Also reminds about the weekly 2-minute pantry check.
 */
export function TodayCookingCard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [meals, setMeals] = useState<TodayMeal[] | null>(null);
  const [log, setLog] = useState<CookingLog[]>([]);
  const [needsCheck, setNeedsCheck] = useState(false);
  const [cooking, setCooking] = useState<{ recipe: CookableRecipe; planRef: string | null; mealType: string | null } | null>(null);
  const [usedFor, setUsedFor] = useState<{ planRef: string | null; mealType: string | null } | null>(null);

  const today = todayISO();

  const load = useCallback(async () => {
    const [plans, logs, pantryCount, lastCheck] = await Promise.all([
      supabase.from('meal_plans').select('id, plan_data, updated_at').order('updated_at', { ascending: false }).limit(10),
      supabase.from('cooking_log').select('*').eq('cooked_on', today),
      supabase.from('pantry_items').select('id', { count: 'exact', head: true }),
      supabase.from('pantry_events').select('created_at').eq('source', 'check').order('created_at', { ascending: false }).limit(1),
    ]);
    const found: TodayMeal[] = [];
    for (const row of plans.data ?? []) {
      const plan = normalizePlan(row.plan_data as Record<string, unknown>);
      const day = plan.days.find((d) => d.date === today);
      if (day) {
        day.meals.forEach((meal, idx) => found.push({ meal, planRef: `${row.id}:${day.dayIndex}:${idx}` }));
        break;
      }
    }
    setMeals(found);
    setLog((logs.data ?? []) as CookingLog[]);
    const last = lastCheck.data?.[0]?.created_at;
    setNeedsCheck((pantryCount.count ?? 0) > 0 && (!last || Date.now() - new Date(last).getTime() > 7 * 24 * 3600 * 1000));
  }, [supabase, today]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('cooking-log-changed', handler);
    window.addEventListener('pantry-items-changed', handler);
    return () => {
      window.removeEventListener('cooking-log-changed', handler);
      window.removeEventListener('pantry-items-changed', handler);
    };
  }, [load]);

  const statusFor = (planRef: string) => log.find((l) => l.plan_ref === planRef)?.status ?? null;

  const skip = async (m: TodayMeal) => {
    const { error } = await supabase.from('cooking_log').insert({
      cooked_on: today,
      meal_type: m.meal.type,
      status: 'skipped',
      recipe_name: m.meal.name,
      plan_ref: m.planRef,
    });
    if (error) toast.error('Could not save');
    else load();
  };

  if (meals === null) return null;
  const evening = new Date().getHours() >= 16;
  const pending = meals.filter((m) => !statusFor(m.planRef));

  return (
    <>
      <Card className="mt-5">
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ChefHat className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">
                  {meals.length === 0 ? 'Cooked today?' : evening && pending.length ? 'Did you cook today’s meals?' : 'Today’s cooking'}
                </p>
                <p className="text-xs text-muted-foreground">One tap keeps your pantry up to date.</p>
              </div>
            </div>
          </div>

          {meals.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/recipes">I cooked a recipe</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUsedFor({ planRef: null, mealType: null })}>
                I cooked something else
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {meals.map((m) => {
                const st = statusFor(m.planRef);
                return (
                  <li key={m.planRef} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                    <Utensils className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', st ? 'text-muted-foreground' : 'text-foreground')}>{m.meal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getMealTypeLabel(m.meal.type)}
                        {st === 'cooked' && ' · cooked ✓'}
                        {st === 'other' && ' · cooked something else ✓'}
                        {st === 'skipped' && ' · not cooked'}
                      </p>
                    </div>
                    {!st && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="sm" onClick={() => setCooking({ recipe: toCookable(m.meal), planRef: m.planRef, mealType: m.meal.type })}>
                          <Check className="mr-1.5 h-4 w-4" /> Cooked it
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Other options">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setUsedFor({ planRef: m.planRef, mealType: m.meal.type })}>
                              <ChefHat className="mr-2 h-4 w-4" /> I cooked something else
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => skip(m)}>
                              <X className="mr-2 h-4 w-4" /> We didn’t cook (ate out, leftovers)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {needsCheck && (
        <Link
          href="/dashboard/pantry?check=1"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-brand-gold/40 bg-brand-gold/10 p-4 transition-colors hover:border-brand-gold"
        >
          <ClipboardCheck className="h-5 w-5 shrink-0 text-[#7a5a30] dark:text-brand-gold" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Weekly pantry check</p>
            <p className="text-xs text-muted-foreground">2 minutes: tap what you still have so suggestions stay accurate.</p>
          </div>
        </Link>
      )}

      <CookDialog
        recipe={cooking?.recipe ?? null}
        open={!!cooking}
        onOpenChange={(o) => !o && setCooking(null)}
        planRef={cooking?.planRef}
        mealType={cooking?.mealType}
        initialPortions={cooking?.recipe.servings}
        onDone={load}
      />
      <UsedItemsDialog
        open={!!usedFor}
        onOpenChange={(o) => !o && setUsedFor(null)}
        planRef={usedFor?.planRef}
        mealType={usedFor?.mealType}
        onDone={load}
      />
    </>
  );
}
