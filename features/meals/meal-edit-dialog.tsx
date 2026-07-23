'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type {
  MealDifficulty,
  MealIngredient,
  MockMeal,
} from '@/features/meals/meal-plan-generator';

interface MealEditDialogProps {
  meal: MockMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (meal: MockMeal) => void;
}

const UNIT_OPTIONS = [
  'g',
  'kg',
  'ml',
  'L',
  'tsp',
  'tbsp',
  'cup',
  'piece',
  'slice',
  'clove',
  'can',
  'pinch',
  'bunch',
] as const;

const DIFFICULTY_OPTIONS: MealDifficulty[] = ['Easy', 'Medium', 'Hard'];

export function MealEditDialog({
  meal,
  open,
  onOpenChange,
  onSave,
}: MealEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [recipe, setRecipe] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState<MealDifficulty>('Medium');

  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setDescription(meal.description);
      setIngredients(
        meal.ingredients.length > 0
          ? meal.ingredients.map((i) => ({ ...i }))
          : [{ name: '', quantity: '', unit: '' }]
      );
      setRecipe(
        Array.isArray(meal.recipe) ? meal.recipe.join('\n') : String(meal.recipe)
      );
      setPrepTime(String(meal.prepTime));
      setCookTime(String(meal.cookTime));
      setServings(String(meal.servings));
      setDifficulty(meal.difficulty);
    }
  }, [meal]);

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (
    index: number,
    field: keyof MealIngredient,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const handleSave = () => {
    if (!meal) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Meal name is required');
      return;
    }
    const parsedPrep = parseInt(prepTime, 10);
    const parsedCook = parseInt(cookTime, 10);
    const parsedServings = parseInt(servings, 10);

    const cleanedIngredients = ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity.trim(),
        unit: i.unit.trim(),
      }));

    const cleanedRecipe = recipe
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      ...meal,
      name: trimmedName,
      description: description.trim(),
      ingredients: cleanedIngredients,
      recipe: cleanedRecipe,
      prepTime: isNaN(parsedPrep) ? 0 : parsedPrep,
      cookTime: isNaN(parsedCook) ? 0 : parsedCook,
      servings: isNaN(parsedServings) ? meal.servings : parsedServings,
      difficulty,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize Meal</DialogTitle>
          <DialogDescription>
            Edit this meal's details. Your changes are saved as part of the
            meal plan when you save the plan.
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
            <div className="flex items-center justify-between">
              <Label>Ingredients</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={addIngredient}
                type="button"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                    placeholder="Ingredient name"
                  />
                  <Input
                    className="w-16"
                    value={ing.quantity}
                    onChange={(e) =>
                      updateIngredient(i, 'quantity', e.target.value)
                    }
                    placeholder="Qty"
                  />
                  <Select
                    value={ing.unit}
                    onValueChange={(v) => updateIngredient(i, 'unit', v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeIngredient(i)}
                    type="button"
                    aria-label="Remove ingredient"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {ingredients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No ingredients added yet.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meal-recipe">
              Recipe{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (one step per line)
              </span>
            </Label>
            <Textarea
              id="meal-recipe"
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              placeholder="Step 1: ...&#10;Step 2: ..."
              rows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meal-prep-time">Prep time (min)</Label>
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
              <Label htmlFor="meal-cook-time">Cook time (min)</Label>
              <Input
                id="meal-cook-time"
                type="number"
                min={0}
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-servings">Servings</Label>
              <Input
                id="meal-servings"
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as MealDifficulty)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
