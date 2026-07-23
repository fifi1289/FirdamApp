'use client';

import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { MockMeal } from '@/features/meals/meal-plan-generator';

interface MealEditDialogProps {
  meal: MockMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (meal: MockMeal) => void;
}

export function MealEditDialog({
  meal,
  open,
  onOpenChange,
  onSave,
}: MealEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [recipe, setRecipe] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');

  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setDescription(meal.description);
      setIngredients(meal.ingredients.join('\n'));
      setRecipe(meal.recipe);
      setPrepTime(String(meal.prepTime));
      setCookTime(String(meal.cookTime));
    }
  }, [meal]);

  const handleSave = () => {
    if (!meal) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Meal name is required');
      return;
    }
    const parsedPrep = parseInt(prepTime, 10);
    const parsedCook = parseInt(cookTime, 10);
    onSave({
      ...meal,
      name: trimmedName,
      description: description.trim(),
      ingredients: ingredients
        .split('\n')
        .map((i) => i.trim())
        .filter(Boolean),
      recipe: recipe.trim(),
      prepTime: isNaN(parsedPrep) ? 0 : parsedPrep,
      cookTime: isNaN(parsedCook) ? 0 : parsedCook,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize Meal</DialogTitle>
          <DialogDescription>
            Customize this meal or replace it with one of your own while
            keeping it in your meal plan.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2 pr-1">
          <div className="space-y-2">
            <Label htmlFor="meal-name">Meal name</Label>
            <Input
              id="meal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grilled Chicken Shawarma Bowl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meal-description">Description</Label>
            <Textarea
              id="meal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of the meal…"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meal-ingredients">
              Ingredients{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (one per line)
              </span>
            </Label>
            <Textarea
              id="meal-ingredients"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="1 cup rice&#10;2 chicken breasts&#10;1 tsp cumin"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meal-recipe">Recipe</Label>
            <Textarea
              id="meal-recipe"
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              placeholder="Step-by-step cooking instructions…"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meal-prep-time">Preparation time (min)</Label>
              <Input
                id="meal-prep-time"
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-cook-time">Cooking time (min)</Label>
              <Input
                id="meal-cook-time"
                type="number"
                min={0}
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="20"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
