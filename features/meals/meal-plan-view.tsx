'use client';

import { useState } from 'react';
import {
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Utensils,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMealTypeLabel } from '@/features/meals/meals-config';
import type { MealPreferencesState } from '@/features/meals/meals-config';
import type {
  GeneratedMealPlan,
  MockMeal,
} from '@/features/meals/meal-plan-generator';
import { MealEditDialog } from '@/features/meals/meal-edit-dialog';

interface MealPlanViewProps {
  plan: GeneratedMealPlan;
  preferences: MealPreferencesState;
  onRegenerate: () => void;
  onBack: () => void;
}

export function MealPlanView({
  plan,
  preferences,
  onRegenerate,
  onBack,
}: MealPlanViewProps) {
  const supabase = createSupabaseBrowserClient();
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [editMeal, setEditMeal] = useState<MockMeal | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleEditSave = (updated: MockMeal) => {
    setCurrentPlan((prev) => ({
      ...prev,
      days: prev.days.map((day) => ({
        ...day,
        meals: day.meals.map((m) => (m.id === updated.id ? updated : m)),
      })),
    }));
    toast.success('Meal updated');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    onRegenerate();
    setRegenerating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('meal_plans').insert({
      name: `Meal Plan — ${new Date().toLocaleDateString()}`,
      plan_data: currentPlan as unknown as Record<string, unknown>,
      preferences:
        preferences as unknown as Record<string, unknown>,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not save meal plan', {
        description: error.message,
      });
      return;
    }
    toast.success('Meal plan saved', {
      description: 'You can find it in your Recent Meal Plans.',
    });
    onBack();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Meal
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Meal Plan
          </Button>
        </div>
      </div>

      {currentPlan.days.map((day) => (
        <div key={day.dayIndex} className="space-y-3">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              {day.dayName}
            </h2>
            <span className="text-xs text-muted-foreground">
              {new Date(day.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {day.meals.map((meal) => (
              <Card key={meal.id} className="overflow-hidden">
                <div className="relative h-32 w-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Badge variant="outline" className="mb-2 text-[10px] font-medium">
                        {getMealTypeLabel(meal.type)}
                      </Badge>
                      <h3 className="text-sm font-semibold text-foreground">
                        {meal.name}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        setEditMeal(meal);
                        setEditOpen(true);
                      }}
                      aria-label="Edit meal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {meal.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <MealEditDialog
        meal={editMeal}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEditSave}
      />
    </div>
  );
}
