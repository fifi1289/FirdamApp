'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Loader2, Lock, Plus, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// --- START OF REPLACEMENT ---
import {
  DURATION_OPTIONS,
  MEAL_TYPES,
  DIETARY_OPTIONS,
  type CuisinePreferences,
  type MealPreferencesState,
} from '@/features/meals/meals-config';
// --- FINISH OF REPLACEMENT ---
import {
  formatDateISO,
  formatWeekRange,
  getStartOfWeek,
} from '@/features/meals/meal-plan-generator';

// --- START OF REPLACEMENT ---
interface MealPreferencesFormProps {
  initial: MealPreferencesState;
  availableCuisines: string[];
  availableDietary: string[];
  onCancel: () => void;
  onGenerate: (preferences: MealPreferencesState, weekStartDate: string) => void;
}

export function MealPreferencesForm({
  initial,
  availableCuisines,
  availableDietary,
  onCancel,
  onGenerate,
}: MealPreferencesFormProps) {
// --- FINISH OF REPLACEMENT ---
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
  const [cuisinePreferences, setCuisinePreferences] = useState<CuisinePreferences>(
    initial.cuisinePreferences ?? {}
  );

  const thisWeekStart = useMemo(() => getStartOfWeek(new Date()), []);
  const nextWeekStart = useMemo(() => {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [thisWeekStart]);
  const [weekOption, setWeekOption] = useState<'this' | 'next' | 'custom'>('this');
  const [customDate, setCustomDate] = useState<Date | undefined>(thisWeekStart);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const weekStartDate = useMemo(() => {
    if (weekOption === 'this') return thisWeekStart;
    if (weekOption === 'next') return nextWeekStart;
    return customDate ?? thisWeekStart;
  }, [weekOption, thisWeekStart, nextWeekStart, customDate]);

  const handleCustomSelect = (date: Date | undefined) => {
    if (!date) return;
    setCustomDate(getStartOfWeek(date));
    setCalendarOpen(false);
  };

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

  const toggleCuisine = (mealKey: string, cuisine: string) => {
    setCuisinePreferences((prev) => {
      const current = prev[mealKey] ?? [];
      const updated = current.includes(cuisine)
        ? current.filter((c) => c !== cuisine)
        : [...current, cuisine];
      return { ...prev, [mealKey]: updated };
    });
  };

  const clearCuisinesForMealType = (mealKey: string) => {
    setCuisinePreferences((prev) => {
      const next = { ...prev };
      delete next[mealKey];
      return next;
    });
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
    onGenerate(
      {
        planningDuration,
        mealTypes,
        usePantryFirst,
        dietaryPreferences,
        allergies,
        cuisinePreferences,
      },
      formatDateISO(weekStartDate)
    );
  };

  // --- START OF REPLACEMENT ---
  const customAllergies = allergies.filter(
    (a) => !availableAllergens.includes(a)
  );
// --- FINISH OF REPLACEMENT ---

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <section className="p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Plan Week
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose which calendar week this meal plan covers.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    { key: 'this', label: 'This Week', sub: formatWeekRange(formatDateISO(thisWeekStart)) },
                    { key: 'next', label: 'Next Week', sub: formatWeekRange(formatDateISO(nextWeekStart)) },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setWeekOption(opt.key)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-xl border p-4 text-left transition-colors',
                      weekOption === opt.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        weekOption === opt.key
                          ? 'text-primary'
                          : 'text-foreground'
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {opt.sub}
                    </span>
                  </button>
                ))}
                <div
                  className={cn(
                    'relative rounded-xl border p-4 transition-colors',
                    weekOption === 'custom'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setWeekOption('custom');
                      setCalendarOpen((v) => !v);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 text-left"
                  >
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        weekOption === 'custom'
                          ? 'text-primary'
                          : 'text-foreground'
                      )}
                    >
                      Custom Week
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {weekOption === 'custom'
                        ? formatWeekRange(formatDateISO(weekStartDate))
                        : 'Pick a starting Monday'}
                    </span>
                  </button>
                  {weekOption === 'custom' && calendarOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2">
                      <div className="rounded-xl border border-border bg-popover p-3 shadow-lg">
                        <Calendar
                          mode="single"
                          selected={customDate}
                          onSelect={handleCustomSelect}
                          disabled={(date) => date < new Date('2000-01-01')}
                          initialFocus
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

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
                {availableDietary.map((option) => {
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
                  Cuisine Preferences
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose which cuisines to include for each meal type. Leave empty to use all cuisines.
                </p>
              </div>
              <div className="space-y-4">
                {MEAL_TYPES.map((meal) => {
                  const selected = cuisinePreferences[meal.key] ?? [];
                  return (
                    <div key={meal.key}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {meal.label}
                        </span>
                        {selected.length > 0 && (
                          <button
                            type="button"
                            onClick={() => clearCuisinesForMealType(meal.key)}
                            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                  
                      <div className="flex flex-wrap gap-1.5">
                        {availableCuisines.map((cuisine) => {
                          const isSelected = selected.includes(cuisine);
// --- FINISH OF REPLACEMENT ---
                          return (
                            <button
                              key={cuisine}
                              type="button"
                              onClick={() => toggleCuisine(meal.key, cuisine)}
                              className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                              )}
                            >
                              {cuisine}
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
            
                {availableAllergens.map((allergy) => {
// --- FINISH OF REPLACEMENT --- {
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
