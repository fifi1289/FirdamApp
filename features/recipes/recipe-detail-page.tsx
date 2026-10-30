'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  ChefHat,
  Clock,
  Globe,
  Heart,
  Lightbulb,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { MealImage } from '@/features/meals/meal-image';
import { IngredientActions } from '@/features/meals/ingredient-actions';
import { checkMealIngredients } from '@/features/meals/pantry-check';
import { formatDateISO } from '@/features/meals/meal-plan-generator';
import type { PantryItem } from '@/types/database';
import {
  fetchRecipe,
  formatDuration,
  formatScaled,
  type MealTypeKey,
  type RecipeDetail,
} from '@/features/recipes/recipe-api';
import { addRecipeToPlan, addRecipeToShopping } from '@/features/recipes/recipe-actions';
import { useRecipeFavorites } from '@/features/recipes/use-favorites';
import { RecipeFormDialog } from '@/features/recipes/recipe-form-dialog';
import { CookDialog } from '@/features/pantry/cook-dialog';
import { useHousehold } from '@/lib/pantry/portions';
import { locale, tr, trn } from '@/lib/i18n';

const MEAL_LABELS: Record<MealTypeKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function AddToPlanDialog({
  open,
  onOpenChange,
  recipe,
  servings,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipe: RecipeDetail;
  servings: number;
}) {
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [type, setType] = useState<MealTypeKey>(recipe.mealType);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setType(recipe.mealType);
  }, [open, recipe.mealType]);

  const save = async () => {
    setSaving(true);
    try {
      await addRecipeToPlan(recipe, date, type, servings);
      toast.success(tr('Added to {0} on {1}', [MEAL_LABELS[type].toLowerCase(), new Date(`${date}T00:00:00`).toLocaleDateString(locale(), { weekday: 'long', month: 'short', day: 'numeric' })]), {
        action: { label: 'Open planner', onClick: () => (window.location.href = '/dashboard/meals') },
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(tr('Could not add to your plan'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const quickDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tr('Add to meal plan')}</DialogTitle>
          <DialogDescription>
            {trn(recipe.name)} {tr('· serves')} {trn(servings)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1.5">
            {quickDays.map((d) => {
              const iso = formatDateISO(d);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDate(iso)}
                  className={cn(
                    'flex flex-col items-center rounded-xl border px-1 py-2 text-xs transition-colors',
                    date === iso ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/40'
                  )}
                >
                  <span className="opacity-80">{d.toLocaleDateString(locale(), { weekday: 'short' })}</span>
                  <span className="text-sm font-semibold">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-date">{tr('Or pick a date')}</Label>
              <Input id="plan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{tr('Meal')}</Label>
              <Select value={type} onValueChange={(v) => setType(v as MealTypeKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEAL_LABELS) as MealTypeKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {trn(MEAL_LABELS[k])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {tr('Replaces anything already planned for that meal.')}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tr('Cancel')}
          </Button>
          <Button onClick={save} disabled={saving || !date}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tr('Add to plan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecipeDetailPage({ recipeKey }: { recipeKey: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(4);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [planOpen, setPlanOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cookOpen, setCookOpen] = useState(false);
  const { household } = useHousehold();
  // Show amounts for the family's portions by default (adults 1, children ¾ or ½).
  const [usedHousehold, setUsedHousehold] = useState(false);
  useEffect(() => {
    if (!usedHousehold && household && recipe) {
      setServings(Math.max(1, Math.round(household.portions)));
      setUsedHousehold(true);
    }
  }, [household, recipe, usedHousehold]);
  const { favorites, toggle } = useRecipeFavorites();

  const load = async () => {
    const r = await fetchRecipe(recipeKey);
    setRecipe(r);
    if (r) setServings(r.servings || 4);
    setLoading(false);
  };

  const loadPantry = () =>
    supabase
      .from('pantry_items')
      .select('*')
      .then(({ data }) => setPantry(data ?? []));

  useEffect(() => {
    load();
    loadPantry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeKey]);

  const factor = recipe ? servings / (recipe.servings || servings) : 1;
  const checks = useMemo(() => {
    if (!recipe) return [];
    return checkMealIngredients(
      recipe.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity != null ? String(i.quantity * factor) : '',
        unit: i.unit,
      })),
      pantry
    );
  }, [recipe, pantry, factor]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {tr('Loading recipe…')}
        </div>
      </AppShell>
    );
  }

  if (!recipe) {
    return (
      <AppShell>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ChefHat className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">{tr('Recipe not found')}</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/dashboard/recipes">{tr('Back to recipes')}</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const fav = favorites.has(recipe.key);
  const haveCount = checks.filter((c) => c.status === 'available').length;

  const toShopping = async () => {
    setAdding(true);
    try {
      const n = await addRecipeToShopping(recipe, servings);
      toast.success(tr('{0} ingredients added to your shopping list', [n]), {
        action: { label: 'View list', onClick: () => router.push('/dashboard/shopping') },
      });
    } catch (err) {
      toast.error(tr('Could not add to shopping list'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAdding(false);
    }
  };

  const remove = async () => {
    if (!recipe.userRecipe || !window.confirm(`Delete "${recipe.name}"?`)) return;
    const { error } = await supabase.from('user_recipes').delete().eq('id', recipe.id);
    if (error) {
      toast.error(tr('Could not delete recipe'));
      return;
    }
    toast.success(tr('Recipe deleted'));
    router.push('/dashboard/recipes');
  };

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tr('Recipes')}
          </Link>
        </Button>
        <div className="flex gap-1">
          {recipe.isOwn && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> {tr('Edit')}
              </Button>
              <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {tr('Delete')}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => window.print()} aria-label={tr('Print recipe')}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-border bg-muted print:hidden">
          <MealImage
            src={recipe.image}
            alt={trn(recipe.name)}
            category={recipe.mealType}
            className="aspect-[4/3] h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-brand-sage/30 bg-brand-sage/10 text-brand-sage">
              {tr('Halal')}
            </Badge>
            {recipe.cuisine && <Badge variant="secondary">{trn(recipe.cuisine)}</Badge>}
            <Badge variant="secondary">{trn(MEAL_LABELS[recipe.mealType])}</Badge>
            <Badge variant="secondary">{trn(recipe.difficulty)}</Badge>
            {recipe.source !== 'catalog' && (
              <Badge variant="outline" className="gap-1">
                {recipe.isPublic && <Globe className="h-3 w-3" />}
                {recipe.isOwn ? tr('Your private recipe') : tr('By {0}', [recipe.author ?? 'a Firdam family'])}
              </Badge>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {trn(recipe.name)}
          </h1>
          {recipe.description && <p className="mt-3 text-muted-foreground">{tr(recipe.description)}</p>}

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Prep', value: formatDuration(recipe.prepMinutes) },
              { label: 'Cook', value: formatDuration(recipe.cookMinutes) },
              { label: 'Total', value: formatDuration(recipe.prepMinutes + recipe.cookMinutes) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">{tr(s.label)}</p>
                <p className="mt-0.5 font-semibold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-primary" /> {tr('Servings')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                aria-label={tr('Fewer servings')}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold tabular-nums">{trn(servings)}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setServings((s) => Math.min(50, s + 1))}
                aria-label={tr('More servings')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-4 print:hidden">
            <Button onClick={() => setCookOpen(true)}>
              <ChefHat className="mr-2 h-4 w-4" /> {tr('I cooked this')}
            </Button>
            <Button variant="outline" onClick={() => setPlanOpen(true)}>
              <CalendarPlus className="mr-2 h-4 w-4" /> {tr('Add to plan')}
            </Button>
            <Button variant="outline" onClick={toShopping} disabled={adding}>
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              {tr('Shopping list')}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const saved = await toggle(recipe.key);
                  toast.success(saved ? tr('Saved to favourites') : tr('Removed from favourites'));
                } catch {
                  toast.error(tr('Could not update favourites'));
                }
              }}
            >
              <Heart className={cn('mr-2 h-4 w-4', fav && 'fill-destructive text-destructive')} />
              {fav ? tr('Saved') : tr('Save')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{tr('Ingredients')}</h2>
              {pantry.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {trn(haveCount)}/{recipe.ingredients.length} {tr('in your pantry')}
                </span>
              )}
            </div>
            <ul className="mt-3 divide-y divide-border/70">
              {recipe.ingredients.map((ing, i) => {
                const status = checks[i]?.status;
                return (
                  <li key={`${ing.name}-${i}`} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="flex items-start gap-2">
                      {pantry.length > 0 && (
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            status === 'available' ? 'bg-brand-sage' : status === 'low' ? 'bg-warning' : 'bg-border'
                          )}
                          title={status === 'available' ? tr('In your pantry') : status === 'low' ? tr('Running low') : tr('Not in pantry')}
                        />
                      )}
                      <span className="capitalize text-foreground">
                        {trn(ing.name)}
                        {ing.optional && <span className="text-muted-foreground"> {tr('(optional)')}</span>}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-right tabular-nums text-muted-foreground">
                        {formatScaled(ing.quantity, factor)} {trn(ing.unit)}
                      </span>
                      {checks[i] && !ing.optional && (
                        <IngredientActions check={checks[i]!} onPantryChange={loadPantry} />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {recipe.nutrition.length > 0 && (
              <div className="mt-5 rounded-xl bg-muted/50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tr('Per serving (approx.)')}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {recipe.nutrition.slice(0, 4).map((n) => (
                    <div key={n.label}>
                      <p className="text-sm font-semibold text-foreground">{Math.round(n.value)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {trn(n.unit)} {tr(n.label)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recipe.allergens.length > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{tr('Contains:')}</span> {recipe.allergens.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-foreground">{tr('Method')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{tr('Tap a step to tick it off as you cook. Bismillah!')}</p>
              <ol className="mt-4 space-y-3">
                {recipe.steps.map((s, i) => {
                  const isDone = done.has(i);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() =>
                          setDone((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          })
                        }
                        className={cn(
                          'flex w-full gap-4 rounded-2xl border p-4 text-left transition-colors',
                          isDone ? 'border-brand-sage/30 bg-brand-sage/5' : 'border-border hover:border-primary/30'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                            isDone ? 'bg-brand-sage text-white' : 'bg-primary/10 text-primary'
                          )}
                        >
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </span>
                        <span className={cn('text-sm leading-relaxed', isDone ? 'text-muted-foreground line-through' : 'text-foreground')}>
                          {tr(s.text)}
                          {s.minutes ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground no-underline">
                              <Clock className="h-3 w-3" /> {trn(s.minutes)} {tr('min')}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          {(recipe.tips.length > 0 || recipe.storage || recipe.reheating || recipe.equipment.length > 0) && (
            <Card>
              <CardContent className="space-y-4 p-5 text-sm">
                {recipe.tips.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-foreground">
                      <Lightbulb className="h-4 w-4 text-brand-gold" /> {tr('Tips')}
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                      {recipe.tips.map((t) => (
                        <li key={t}>{trn(t)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {recipe.equipment.length > 0 && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{tr('Equipment:')}</span> {recipe.equipment.join(', ')}
                  </p>
                )}
                {recipe.storage && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{tr('Storage:')}</span> {trn(recipe.storage)}
                  </p>
                )}
                {recipe.reheating && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{tr('Reheating:')}</span> {trn(recipe.reheating)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AddToPlanDialog open={planOpen} onOpenChange={setPlanOpen} recipe={recipe} servings={servings} />
      {recipe.userRecipe && (
        <RecipeFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          recipe={recipe.userRecipe}
          onSaved={() => load()}
        />
      )}
      <CookDialog
        recipe={
          recipe
            ? {
                key: recipe.key,
                name: recipe.name,
                servings: recipe.servings || 4,
                ingredients: recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, optional: i.optional })),
              }
            : null
        }
        open={cookOpen}
        onOpenChange={setCookOpen}
        initialPortions={servings}
        onDone={() =>
          supabase
            .from('pantry_items')
            .select('*')
            .then(({ data }) => setPantry(data ?? []))
        }
      />
    </AppShell>
  );
}
