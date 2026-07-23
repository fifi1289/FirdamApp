'use client';

import { useState } from 'react';
import {
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Utensils,
  Users,
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
import { MealDetailDialog } from '@/features/meals/meal-detail-dialog';

interface MealPlanViewProps {
  plan: GeneratedMealPlan;
  preferences: MealPreferencesState;
  planId: string | null;
  onRegenerate: () => void;
  onBack: () => void;
}

export function MealPlanView({
  plan,
  preferences,
  planId,
  onRegenerate,
  onBack,
}: MealPlanViewProps) {
  const supabase = createSupabaseBrowserClient();
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [editMeal, setEditMeal] = useState<MockMeal | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailMeal, setDetailMeal] = useState<MockMeal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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
    const payload = {
      name: `Meal Plan — ${new Date().toLocaleDateString()}`,
      plan_data: currentPlan as unknown as Record<string, unknown>,
      preferences: preferences as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    };
    const result = planId
      ? await supabase.from('meal_plans').update(payload).eq('id', planId)
      : await supabase.from('meal_plans').insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error('Could not save meal plan', {
        description: result.error.message,
      });
      return;
    }
    toast.success(
      planId ? 'Meal plan updated' : 'Meal plan saved',
      {
        description: planId
          ? 'Your changes have been saved.'
          : 'You can find it in your Recent Meal Plans.',
      }
    );
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
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {planId ? 'Save Changes' : 'Save Meal Plan'}
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
              <Card
                key={meal.id}
                className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                onClick={() => {
                  setDetailMeal(meal);
                  setDetailOpen(true);
                }}
              >
                <div className="relative h-32 w-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <Badge variant="outline" className="mb-2 text-[10px] font-medium">
                    {getMealTypeLabel(meal.type)}
                  </Badge>
                  <h3 className="text-sm font-semibold text-foreground">
                    {meal.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                    {meal.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    {meal.ingredients.length > 0 && (
                      <span>{meal.ingredients.length} ingredients</span>
                    )}
                    {(meal.prepTime > 0 || meal.cookTime > 0) && (
                      <span>
                        {meal.prepTime + meal.cookTime} min total
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {meal.servings}
                    </span>
                    <span>{meal.difficulty}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 -ml-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditMeal(meal);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Customize Meal
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <MealDetailDialog
        meal={detailMeal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <MealEditDialog
        meal={editMeal}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEditSave}
      />
    </div>
  );
}
