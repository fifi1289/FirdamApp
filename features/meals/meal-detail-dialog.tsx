'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Clock,
  Loader2,
  PackageX,
  Soup,
  Users,
  Utensils,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getMealTypeLabel } from '@/features/meals/meals-config';
import { MealImage } from '@/features/meals/meal-image';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  checkMealIngredients,
  formatQuantityWithUnit,
  type IngredientCheck,
  type IngredientStatus,
} from '@/features/meals/pantry-check';
import type { PantryItem } from '@/types/database';

interface MealDetailDialogProps {
  /** The meal card that was clicked (used as fallback while loading). */
  meal: import('@/features/meals/meal-plan-generator').MockMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pantryItems: PantryItem[];
}

interface RecipeIngredientRow {
  quantity: number | null;
  unit: string | null;
  optional: boolean | null;
  display_order: number | null;
  notes: string | null;
  ingredient: { name: string } | null;
}

interface RecipeStepRow {
  step_number: number;
  instruction: string;
  estimated_minutes: number | null;
}

interface RecipeTipRow {
  tip: string;
  display_order: number | null;
}

interface RecipeEquipmentRow {
  equipment: string;
  display_order: number | null;
}

interface RecipeAdaptationRow {
  title: string;
  adaptation_instructions: string;
  age_group: { name: string } | null;
}

interface RecipeAgeGroupRow {
  recommended: boolean | null;
  age_group: { name: string } | null;
}

interface RecipeTagRow {
  tag: { name: string } | null;
}

interface RecipeAllergenRow {
  allergen: { name: string } | null;
}

interface RecipeDetail {
  id: string;
  name: string;
  short_description: string | null;
  long_description: string | null;
  image_path: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  cholesterol: number | null;
  storage_instructions: string | null;
  reheating_instructions: string | null;
  cuisine: { name: string } | null;
  meal_type: { name: string } | null;
  difficulty: { name: string } | null;
  recipe_ingredients: RecipeIngredientRow[];
  recipe_steps: RecipeStepRow[];
  recipe_tips: RecipeTipRow[];
  recipe_equipment: RecipeEquipmentRow[];
  recipe_tags: RecipeTagRow[];
  recipe_allergens: RecipeAllergenRow[];
  recipe_age_groups: RecipeAgeGroupRow[];
  recipe_adaptations: RecipeAdaptationRow[];
}

interface NutritionField {
  key: keyof Pick<
    RecipeDetail,
    'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium' | 'cholesterol'
  >;
  label: string;
  unit: string;
}

const NUTRITION_FIELDS: NutritionField[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
];

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const STATUS_CONFIG: Record<
  IngredientStatus,
  { icon: typeof CheckCircle2; label: string; className: string; textClass: string }
> = {
  available: {
    icon: CheckCircle2,
    label: 'Available',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  low: {
    icon: AlertTriangle,
    label: 'Low quantity',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  missing: {
    icon: PackageX,
    label: 'Not available',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    textClass: 'text-destructive',
  },
};

interface DetailState {
  loading: boolean;
  recipe: RecipeDetail | null;
  error: string | null;
}

const RECIPE_SELECT = `
  id,
  name,
  short_description,
  long_description,
  image_path,
  prep_time_minutes,
  cook_time_minutes,
  servings,
  calories,
  protein,
  carbs,
  fat,
  fiber,
  sugar,
  sodium,
  cholesterol,
  storage_instructions,
  reheating_instructions,
  cuisine:cuisines(name),
  meal_type:meal_types(name),
  difficulty:difficulties(name),
  recipe_ingredients(
    quantity,
    unit,
    optional,
    display_order,
    notes,
    ingredient:ingredients(name)
  ),
  recipe_steps(
    step_number,
    instruction,
    estimated_minutes
  ),
  recipe_tips(
    tip,
    display_order
  ),
  recipe_equipment(
    equipment,
    display_order
  ),
  recipe_tags(
    tag:tags(name)
  ),
  recipe_allergens(
    allergen:allergens(name)
  ),
  recipe_age_groups(
    recommended,
    age_group:age_groups(name)
  ),
  recipe_adaptations(
    title,
    adaptation_instructions,
    age_group:age_groups(name)
  )
` as const;

function PantryStatusRow({ check }: { check: IngredientCheck }) {
  const config = STATUS_CONFIG[check.status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {check.ingredient.name}
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Required</span>
          <span className="font-medium text-foreground">
            {formatQuantityWithUnit(
              check.requiredQuantity,
              check.requiredUnit
            )}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Available</span>
          <span className="font-medium text-foreground">
            {check.matchedItem
              ? formatQuantityWithUnit(
                  check.availableQuantity,
                  check.availableUnit
                )
              : 'Not in pantry'}
          </span>
        </div>
        {check.status === 'available' && (
          <div className="flex items-center justify-between gap-2">
            <span>Remaining</span>
            <span className={`font-medium ${config.textClass}`}>
              {formatQuantityWithUnit(
                check.remainingQuantity,
                check.remainingUnit
              )}
            </span>
          </div>
        )}
        {check.status === 'low' && check.matchedItem && (
          <div className="flex items-center justify-between gap-2">
            <span>Status</span>
            <span className={`font-medium ${config.textClass}`}>
              Insufficient quantity
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function NutritionGrid({ recipe }: { recipe: RecipeDetail }) {
  const rows = NUTRITION_FIELDS.map((f) => ({
    label: f.label,
    value: recipe[f.key],
    unit: f.unit,
  })).filter((r) => r.value != null);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <h4 className="text-sm font-semibold text-foreground">Nutrition</h4>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col items-center gap-1 text-center">
            <span className="font-semibold text-foreground">{r.value}</span>
            <span className="text-muted-foreground">
              {r.unit} {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MealDetailDialog({
  meal,
  open,
  onOpenChange,
  pantryItems,
}: MealDetailDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [detail, setDetail] = useState<DetailState>({
    loading: false,
    recipe: null,
    error: null,
  });

  useEffect(() => {
    if (!open) {
      setDetail({ loading: false, recipe: null, error: null });
      return;
    }

    let cancelled = false;
    setDetail({ loading: true, recipe: null, error: null });

    (async () => {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select(RECIPE_SELECT)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setDetail({ loading: false, recipe: null, error: error.message });
          return;
        }
        if (!data) {
          setDetail({
            loading: false,
            recipe: null,
            error: 'No recipe found.',
          });
          return;
        }
        setDetail({ loading: false, recipe: data as unknown as RecipeDetail, error: null });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load recipe.';
        setDetail({ loading: false, recipe: null, error: message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  const recipe = detail.recipe;
  const loading = detail.loading;
  const errorMsg = detail.error;

  const ingredients = (recipe?.recipe_ingredients ?? [])
    .slice()
    .sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    )
    .map((ri) => ({
      name: ri.ingredient?.name ?? '',
      quantity: ri.quantity != null ? String(ri.quantity) : '',
      unit: ri.unit ?? '',
      optional: ri.optional ?? false,
      notes: ri.notes ?? '',
    }));

  const pantryIngredients = ingredients.map((ing) => ({
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
  }));

  const checks = checkMealIngredients(pantryIngredients, pantryItems);
  const availableCount = checks.filter((c) => c.status === 'available').length;
  const lowCount = checks.filter((c) => c.status === 'low').length;
  const missingCount = checks.filter((c) => c.status === 'missing').length;

  const steps = (recipe?.recipe_steps ?? [])
    .slice()
    .sort((a, b) => a.step_number - b.step_number);

  const equipment = (recipe?.recipe_equipment ?? [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const tips = (recipe?.recipe_tips ?? [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const tags = (recipe?.recipe_tags ?? [])
    .map((rt) => rt.tag?.name)
    .filter((n): n is string => Boolean(n));

  const allergens = (recipe?.recipe_allergens ?? [])
    .map((ra) => ra.allergen?.name)
    .filter((n): n is string => Boolean(n));

  const ageGroups = (recipe?.recipe_age_groups ?? [])
    .filter((rag) => rag.recommended)
    .map((rag) => rag.age_group?.name)
    .filter((n): n is string => Boolean(n));

  const adaptations = (recipe?.recipe_adaptations ?? [])
    .map((ra) => ({
      title: ra.title,
      instructions: ra.adaptation_instructions,
      ageGroup: ra.age_group?.name ?? 'General',
    }))
    .reduce<Record<string, { title: string; instructions: string }[]>>(
      (groups, item) => {
        const key = item.ageGroup;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ title: item.title, instructions: item.instructions });
        return groups;
      },
      {}
    );

  const prepTime = recipe?.prep_time_minutes ?? meal?.prepTime ?? 0;
  const cookTime = recipe?.cook_time_minutes ?? meal?.cookTime ?? 0;
  const servings = recipe?.servings ?? meal?.servings ?? 0;
  const difficultyName = recipe?.difficulty?.name ?? meal?.difficulty ?? 'Medium';
  const mealTypeKey = (recipe?.meal_type?.name ?? meal?.type ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-');
  const mealTypeLabel = recipe?.meal_type?.name ?? getMealTypeLabel(meal?.type ?? '');
  const recipeName = recipe?.name ?? meal?.name ?? '';
  const description = recipe?.short_description ?? meal?.description ?? '';
  const cuisineName = recipe?.cuisine?.name ?? '';
  const imageUrl = recipe?.image_path ?? meal?.image ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading recipe…</p>
          </div>
        )}

        {!loading && errorMsg && !recipe && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <PackageX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </div>
        )}

        {!loading && recipe && (
          <>
            <div className="relative -mx-6 -mt-6 h-44 w-[calc(100%+3rem)] overflow-hidden">
              <MealImage
                src={imageUrl}
                alt={recipeName}
                category={mealTypeKey}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="bg-white/90 text-foreground shadow-sm"
                >
                  {mealTypeLabel}
                </Badge>
                <Badge
                  className={`${DIFFICULTY_STYLES[difficultyName] ?? DIFFICULTY_STYLES.Medium} shadow-sm`}
                >
                  {difficultyName}
                </Badge>
                {cuisineName && (
                  <Badge
                    variant="secondary"
                    className="bg-white/90 text-foreground shadow-sm"
                  >
                    {cuisineName}
                  </Badge>
                )}
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-lg">{recipeName}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {recipe.long_description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {recipe.long_description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs sm:grid-cols-4">
              <div className="flex flex-col items-center gap-1 text-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{prepTime}</span>
                <span className="text-muted-foreground">min prep</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Utensils className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{cookTime}</span>
                <span className="text-muted-foreground">min cook</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Soup className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  {prepTime + cookTime}
                </span>
                <span className="text-muted-foreground">min total</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{servings}</span>
                <span className="text-muted-foreground">servings</span>
              </div>
            </div>

            <NutritionGrid recipe={recipe} />

            {ingredients.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ChefHat className="h-4 w-4 text-primary" />
                  Ingredients
                </h4>
                <ul className="space-y-1.5">
                  {ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-2 text-sm text-foreground"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span>{ing.name}</span>
                        {ing.notes && (
                          <span className="text-[11px] text-muted-foreground">
                            {ing.notes}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {ing.optional && (
                          <Badge variant="outline" className="text-[10px]">
                            Optional
                          </Badge>
                        )}
                        {ing.quantity && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {ing.quantity} {ing.unit}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ingredients.length > 0 && pantryItems.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <PackageX className="h-4 w-4 text-primary" />
                      Pantry Status
                    </h4>
                    <div className="flex items-center gap-2 text-[11px]">
                      {availableCount > 0 && (
                        <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {availableCount}
                        </span>
                      )}
                      {lowCount > 0 && (
                        <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          {lowCount}
                        </span>
                      )}
                      {missingCount > 0 && (
                        <span className="flex items-center gap-1 font-medium text-destructive">
                          <PackageX className="h-3 w-3" />
                          {missingCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {checks.map((check, i) => (
                      <PantryStatusRow key={i} check={check} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {steps.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Steps</h4>
                  <ol className="space-y-3">
                    {steps.map((step) => (
                      <li key={step.step_number} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {step.step_number}
                        </span>
                        <div className="pt-0.5">
                          <p className="text-sm leading-relaxed text-foreground">
                            {step.instruction}
                          </p>
                          {step.estimated_minutes != null && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {step.estimated_minutes} min
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {equipment.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Utensils className="h-4 w-4 text-primary" />
                    Equipment
                  </h4>
                  <ul className="flex flex-wrap gap-2">
                    {equipment.map((eq, i) => (
                      <li key={i}>
                        <Badge variant="secondary" className="text-xs">
                          {eq.equipment}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {tips.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Tips</h4>
                  <ul className="space-y-1.5">
                    {tips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex gap-2 rounded-md border border-border/40 px-3 py-2 text-sm text-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="leading-relaxed">{tip.tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {allergens.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Allergens</h4>
                  <div className="flex flex-wrap gap-2">
                    {allergens.map((allergen) => (
                      <Badge
                        key={allergen}
                        variant="outline"
                        className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs"
                      >
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {ageGroups.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Recommended Age Groups
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ageGroups.map((ag) => (
                      <Badge key={ag} variant="secondary" className="text-xs">
                        {ag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {Object.keys(adaptations).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Adaptations
                  </h4>
                  {Object.entries(adaptations).map(([group, items]) => (
                    <div key={group} className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {group}
                      </p>
                      {items.map((item, i) => (
                        <div
                          key={i}
                          className="rounded-md border border-border/40 px-3 py-2"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {item.instructions}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {recipe.storage_instructions && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-foreground">Storage</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {recipe.storage_instructions}
                  </p>
                </div>
              </>
            )}

            {recipe.reheating_instructions && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-foreground">Reheating</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {recipe.reheating_instructions}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
