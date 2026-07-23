'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const DURATION_OPTIONS = [
  { value: 3, label: '3 Days' },
  { value: 5, label: '5 Days' },
  { value: 7, label: '7 Days' },
] as const;

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
] as const;

const DIETARY_OPTIONS = [
  'Halal',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Seafood-Free',
  'Other',
] as const;

const DEFAULTS = {
  planningDuration: 7,
  mealTypes: ['breakfast', 'lunch', 'dinner'] as string[],
  usePantryFirst: false,
  dietaryPreferences: ['Halal'] as string[],
  allergies: [] as string[],
};

export function MealsDashboard() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planningDuration, setPlanningDuration] = useState<number>(
    DEFAULTS.planningDuration
  );
  const [mealTypes, setMealTypes] = useState<string[]>(DEFAULTS.mealTypes);
  const [usePantryFirst, setUsePantryFirst] = useState(
    DEFAULTS.usePantryFirst
  );
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    DEFAULTS.dietaryPreferences
  );
  const [allergies, setAllergies] = useState<string[]>(DEFAULTS.allergies);
  const [allergyInput, setAllergyInput] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('meal_preferences')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Failed to load meal preferences:', error.message);
      }
      if (data) {
        setPlanningDuration(data.planning_duration);
        setMealTypes(data.meal_types);
        setUsePantryFirst(data.use_pantry_first);
        setDietaryPreferences(data.dietary_preferences);
        setAllergies(data.allergies);
      }
      setLoading(false);
    })();
  }, [supabase]);

  const toggleMealType = (key: string) => {
    setMealTypes((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const toggleDietary = (option: string) => {
    setDietaryPreferences((prev) =>
      prev.includes(option)
        ? prev.filter((d) => d !== option)
        : [...prev, option]
    );
  };

  const addAllergy = () => {
    const trimmed = allergyInput.trim();
    if (!trimmed) return;
    if (
      allergies.some((a) => a.toLowerCase() === trimmed.toLowerCase())
    ) {
      setAllergyInput('');
      return;
    }
    setAllergies((prev) => [...prev, trimmed]);
    setAllergyInput('');
  };

  const removeAllergy = (allergy: string) => {
    setAllergies((prev) => prev.filter((a) => a !== allergy));
  };

  const handleGenerate = async () => {
    setSaving(true);
    const { error } = await supabase.from('meal_preferences').upsert(
      {
        planning_duration: planningDuration,
        meal_types: mealTypes,
        use_pantry_first: usePantryFirst,
        dietary_preferences: dietaryPreferences,
        allergies,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    setSaving(false);
    if (error) {
      toast.error('Could not save preferences', {
        description: error.message,
      });
      return;
    }
    toast.success('Preferences saved', {
      description: 'Your meal plan preferences are ready for the next step.',
    });
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader
          title="Meal Planner"
          description="Plan and organize your family's meals."
        />
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center px-6 py-20 text-center">
            <p className="text-sm text-muted-foreground">
              Loading your preferences…
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Meal Planner"
        description="Plan and organize your family's meals."
      />

      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <section className="p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Planning Duration
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  How many days should the meal plan cover?
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlanningDuration(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-xl border p-4 transition-colors',
                      planningDuration === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <span className="text-2xl font-bold tabular-nums">
                      {opt.value}
                    </span>
                    <span className="text-xs font-medium">Days</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Meal Types
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose which meals to include in your plan.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MEAL_TYPES.map((meal) => {
                  const enabled = mealTypes.includes(meal.key);
                  return (
                    <div
                      key={meal.key}
                      className={cn(
                        'flex items-center justify-between rounded-xl border p-3 transition-colors',
                        enabled
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-card'
                      )}
                    >
                      <span
                        className={cn(
                          'text-sm font-medium',
                          enabled
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {meal.label}
                      </span>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleMealType(meal.key)}
                        aria-label={meal.label}
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Use pantry ingredients first
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Prioritize ingredients you already have on hand.
                  </p>
                </div>
                <Switch
                  checked={usePantryFirst}
                  onCheckedChange={setUsePantryFirst}
                  aria-label="Use pantry ingredients first"
                />
              </div>
            </section>

            <section className="p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Dietary Preferences
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select all that apply to your household.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((option) => {
                  const selected = dietaryPreferences.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleDietary(option)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Allergies
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter any allergies to avoid in your meal plan.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAllergy();
                    }
                  }}
                  placeholder="Add an allergy…"
                  className="flex-1"
                  aria-label="Add an allergy"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAllergy}
                  disabled={!allergyInput.trim()}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add
                </Button>
              </div>
              {allergies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {allergies.map((allergy) => (
                    <Badge
                      key={allergy}
                      variant="outline"
                      className="gap-1.5 py-1 pl-3 pr-1.5 text-xs"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => removeAllergy(allergy)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Remove ${allergy}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </section>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleGenerate} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Meal Plan
            </>
          )}
        </Button>
      </div>
    </AppShell>
  );
}
