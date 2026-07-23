'use client';

import { useState } from 'react';
import { ArrowLeft, Loader2, Lock, Plus, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DURATION_OPTIONS,
  MEAL_TYPES,
  DIETARY_OPTIONS,
  PREDEFINED_ALLERGIES,
  type MealPreferencesState,
} from '@/features/meals/meals-config';

interface MealPreferencesFormProps {
  initial: MealPreferencesState;
  onCancel: () => void;
  onGenerate: (preferences: MealPreferencesState) => void;
}

export function MealPreferencesForm({
  initial,
  onCancel,
  onGenerate,
}: MealPreferencesFormProps) {
  const [generating, setGenerating] = useState(false);
  const [planningDuration, setPlanningDuration] = useState<number>(
    initial.planningDuration
  );
  const [mealTypes, setMealTypes] = useState<string[]>(initial.mealTypes);
  const [usePantryFirst, setUsePantryFirst] = useState(initial.usePantryFirst);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    initial.dietaryPreferences
  );
  const [allergies, setAllergies] = useState<string[]>(initial.allergies);
  const [otherSelected, setOtherSelected] = useState(false);
  const [customAllergy, setCustomAllergy] = useState('');

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

  const toggleAllergy = (allergy: string) => {
    setAllergies((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy]
    );
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (!trimmed) return;
    if (allergies.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      setCustomAllergy('');
      return;
    }
    setAllergies((prev) => [...prev, trimmed]);
    setCustomAllergy('');
  };

  const removeCustomAllergy = (allergy: string) => {
    setAllergies((prev) => prev.filter((a) => a !== allergy));
  };

  const handleGenerate = async () => {
    if (!DURATION_OPTIONS.some((o) => o.value === planningDuration)) {
      toast.error('Please select a planning duration');
      return;
    }
    if (mealTypes.length === 0) {
      toast.error('Please select at least one meal type');
      return;
    }

    setGenerating(true);
    onGenerate({
      planningDuration,
      mealTypes,
      usePantryFirst,
      dietaryPreferences,
      allergies,
    });
  };

  const customAllergies = allergies.filter(
    (a) => !PREDEFINED_ALLERGIES.includes(a as (typeof PREDEFINED_ALLERGIES)[number])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      </div>

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
                  Optional preferences for your household.
                </p>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <Badge
                  className="gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  variant="outline"
                >
                  <Lock className="h-3 w-3" />
                  Halal
                </Badge>
                <span className="text-xs text-muted-foreground">
                  All meal plans and recipes are always halal.
                </span>
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
                  Select any allergies to avoid in your meal plan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_ALLERGIES.map((allergy) => {
                  const selected = allergies.includes(allergy);
                  return (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => toggleAllergy(allergy)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {allergy}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setOtherSelected((v) => !v)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                    otherSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  Other
                </button>
              </div>

              {otherSelected && (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomAllergy();
                      }
                    }}
                    placeholder="Enter a custom allergy…"
                    className="flex-1"
                    aria-label="Enter a custom allergy"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomAllergy}
                    disabled={!customAllergy.trim()}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add
                  </Button>
                </div>
              )}

              {customAllergies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {customAllergies.map((allergy) => (
                    <Badge
                      key={allergy}
                      variant="outline"
                      className="gap-1.5 py-1 pl-3 pr-1.5 text-xs"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => removeCustomAllergy(allergy)}
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

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Meal Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
