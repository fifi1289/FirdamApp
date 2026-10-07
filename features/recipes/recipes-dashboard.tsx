'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChefHat, Clock, Flame, Heart, Loader2, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MealImage } from '@/features/meals/meal-image';
import { cn } from '@/lib/utils';
import { usePlan } from '@/lib/plan/plan';
import { UpgradeDialog } from '@/components/plan/upgrade-prompt';
import {
  fetchAllRecipes,
  formatDuration,
  totalMinutes,
  type MealTypeKey,
  type RecipeSummary,
} from '@/features/recipes/recipe-api';
import { useRecipeFavorites } from '@/features/recipes/use-favorites';
import { RecipeFormDialog } from '@/features/recipes/recipe-form-dialog';

type Tab = 'all' | 'favorites' | 'mine' | 'community';

const MEAL_FILTERS: { value: MealTypeKey | 'all'; label: string }[] = [
  { value: 'all', label: 'Any meal' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks & desserts' },
];

const TIME_FILTERS = [
  { value: 'any', label: 'Any time' },
  { value: '20', label: 'Under 20 min' },
  { value: '30', label: 'Under 30 min' },
  { value: '60', label: 'Under 1 hour' },
];

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: 'bg-brand-sage/15 text-brand-sage',
  Medium: 'bg-warning/20 text-[#7a5a30] dark:text-warning',
  Hard: 'bg-destructive/10 text-destructive',
};

export function RecipeCard({
  recipe,
  favorite,
  onToggleFavorite,
}: {
  recipe: RecipeSummary;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const mins = totalMinutes(recipe);
  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/dashboard/recipes/${recipe.key}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <MealImage
            src={recipe.image}
            alt={recipe.name}
            category={recipe.mealType}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span
            className={cn(
              'absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur',
              DIFFICULTY_STYLE[recipe.difficulty]
            )}
          >
            {recipe.difficulty}
          </span>
          {recipe.source !== 'catalog' && (
            <span className="absolute bottom-3 left-3 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
              {recipe.source === 'mine' ? 'Your recipe' : `By ${recipe.author ?? 'a Firdam family'}`}
            </span>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/recipes/${recipe.key}`} className="min-w-0">
            <h3 className="line-clamp-1 font-semibold text-foreground group-hover:text-primary">{recipe.name}</h3>
            <p className="text-xs text-muted-foreground">
              {[recipe.cuisine, recipe.mealType.charAt(0).toUpperCase() + recipe.mealType.slice(1)]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </Link>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={favorite ? 'Remove from favourites' : 'Save to favourites'}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            <Heart className={cn('h-4 w-4', favorite && 'fill-destructive text-destructive')} />
          </button>
        </div>
        {recipe.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {mins > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(mins)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            Serves {recipe.servings}
          </span>
          {recipe.calories != null && (
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" />
              {recipe.calories} kcal
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecipesDashboard() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [meal, setMeal] = useState<MealTypeKey | 'all'>('all');
  const [cuisine, setCuisine] = useState('all');
  const [time, setTime] = useState('any');
  const [formOpen, setFormOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { favorites, toggle } = useRecipeFavorites();
  const { atLimit } = usePlan();

  useEffect(() => {
    fetchAllRecipes()
      .then(({ recipes: r }) => setRecipes(r))
      .finally(() => setLoading(false));
  }, []);

  const cuisines = useMemo(
    () => Array.from(new Set(recipes.map((r) => r.cuisine).filter(Boolean) as string[])).sort(),
    [recipes]
  );
  const myCount = recipes.filter((r) => r.source === 'mine').length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (tab === 'favorites' && !favorites.has(r.key)) return false;
      if (tab === 'mine' && r.source !== 'mine') return false;
      if (tab === 'community' && r.source !== 'community') return false;
      if (meal !== 'all' && r.mealType !== meal) return false;
      if (cuisine !== 'all' && r.cuisine !== cuisine) return false;
      if (time !== 'any' && totalMinutes(r) > Number(time)) return false;
      if (q && !`${r.name} ${r.description ?? ''} ${r.cuisine ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recipes, tab, favorites, meal, cuisine, time, query]);

  const onToggleFavorite = async (key: string) => {
    try {
      const saved = await toggle(key);
      toast.success(saved ? 'Saved to favourites' : 'Removed from favourites');
    } catch {
      toast.error('Could not update favourites');
    }
  };

  const startNew = () => {
    if (atLimit('customRecipes', myCount)) {
      setUpgradeOpen(true);
      return;
    }
    setFormOpen(true);
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: 'All recipes' },
    { value: 'favorites', label: `Favourites${favorites.size ? ` (${favorites.size})` : ''}` },
    { value: 'mine', label: `My recipes${myCount ? ` (${myCount})` : ''}` },
    { value: 'community', label: 'From the community' },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Recipes"
        description="Halal recipes from around the Muslim world. Save favourites, scale servings, and add them to your meal plan in one tap."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/meals">Meal planner</Link>
        </Button>
        <Button size="sm" onClick={startNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add your recipe
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 sm:inline-flex">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
              tab === t.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search biryani, lentils, tagine…"
            className="pl-9"
            aria-label="Search recipes"
          />
        </div>
        <Select value={meal} onValueChange={(v) => setMeal(v as MealTypeKey | 'all')}>
          <SelectTrigger className="md:w-[170px]" aria-label="Meal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEAL_FILTERS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cuisine} onValueChange={setCuisine}>
          <SelectTrigger className="md:w-[170px]" aria-label="Cuisine">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any cuisine</SelectItem>
            {cuisines.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={time} onValueChange={setTime}>
          <SelectTrigger className="md:w-[150px]" aria-label="Time">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_FILTERS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading recipes…
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ChefHat className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              {tab === 'favorites'
                ? 'No favourites yet'
                : tab === 'mine'
                  ? 'You haven’t added a recipe yet'
                  : tab === 'community'
                    ? 'No community recipes yet'
                    : recipes.length === 0
                      ? 'The recipe library is empty'
                      : 'No recipes match'}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {tab === 'favorites'
                ? 'Tap the heart on any recipe to keep it here.'
                : tab === 'mine' || tab === 'community'
                  ? 'Add a family favourite and choose to share it with the community.'
                  : recipes.length === 0
                    ? 'Run the database migrations to add the starter halal recipes.'
                    : 'Try a different search or filter.'}
            </p>
            {(tab === 'mine' || tab === 'community') && (
              <Button size="sm" className="mt-5" onClick={startNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add your recipe
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {visible.length} recipe{visible.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((r) => (
              <RecipeCard
                key={r.key}
                recipe={r}
                favorite={favorites.has(r.key)}
                onToggleFavorite={() => onToggleFavorite(r.key)}
              />
            ))}
          </div>
        </>
      )}

      <RecipeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(id) => router.push(`/dashboard/recipes/u-${id}`)}
      />
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} limitKey="customRecipes" />
    </AppShell>
  );
}
