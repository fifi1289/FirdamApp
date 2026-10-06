'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { displayNameFor } from '@/lib/auth/display-name';
import type { UserRecipe } from '@/types/database';

type Line = { name: string; quantity: string; unit: string };

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack / dessert' },
] as const;

interface RecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: UserRecipe | null;
  onSaved: (id: string) => void;
}

export function RecipeFormDialog({ open, onOpenChange, recipe, onSaved }: RecipeFormDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [mealType, setMealType] = useState<UserRecipe['meal_type']>('dinner');
  const [difficulty, setDifficulty] = useState<UserRecipe['difficulty']>('Easy');
  const [prep, setPrep] = useState('15');
  const [cook, setCook] = useState('30');
  const [servings, setServings] = useState('4');
  const [lines, setLines] = useState<Line[]>([{ name: '', quantity: '', unit: '' }]);
  const [steps, setSteps] = useState('');
  const [tips, setTips] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(recipe?.name ?? '');
    setDescription(recipe?.description ?? '');
    setCuisine(recipe?.cuisine ?? '');
    setMealType(recipe?.meal_type ?? 'dinner');
    setDifficulty(recipe?.difficulty ?? 'Easy');
    setPrep(String(recipe?.prep_minutes ?? 15));
    setCook(String(recipe?.cook_minutes ?? 30));
    setServings(String(recipe?.servings ?? 4));
    setLines(recipe?.ingredients?.length ? recipe.ingredients : [{ name: '', quantity: '', unit: '' }]);
    setSteps((recipe?.steps ?? []).join('\n'));
    setTips(recipe?.tips ?? '');
    setImageUrl(recipe?.image_url ?? '');
    setIsPublic(recipe?.is_public ?? false);
  }, [open, recipe]);

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = async () => {
    const ingredients = lines
      .map((l) => ({ name: l.name.trim(), quantity: l.quantity.trim(), unit: l.unit.trim() }))
      .filter((l) => l.name);
    const stepList = steps
      .split('\n')
      .map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter(Boolean);
    if (!name.trim()) return toast.error('Give your recipe a name.');
    if (ingredients.length === 0) return toast.error('Add at least one ingredient.');
    if (stepList.length === 0) return toast.error('Add the method — one step per line.');
    if (imageUrl && !/^https:\/\//i.test(imageUrl.trim())) return toast.error('Image link must start with https://');

    const row = {
      name: name.trim(),
      description: description.trim() || null,
      cuisine: cuisine.trim() || null,
      meal_type: mealType,
      difficulty,
      prep_minutes: Math.max(0, Number(prep) || 0),
      cook_minutes: Math.max(0, Number(cook) || 0),
      servings: Math.min(50, Math.max(1, Number(servings) || 4)),
      ingredients,
      steps: stepList,
      tips: tips.trim() || null,
      image_url: imageUrl.trim() || null,
      is_public: isPublic,
      author_name: displayNameFor(user),
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    const result = recipe
      ? await supabase.from('user_recipes').update(row).eq('id', recipe.id).select('id').single()
      : await supabase.from('user_recipes').insert(row).select('id').single();
    setSaving(false);
    if (result.error) {
      toast.error('Could not save recipe', { description: result.error.message });
      return;
    }
    toast.success(recipe ? 'Recipe updated' : 'Recipe saved to your collection');
    onOpenChange(false);
    onSaved(result.data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Edit recipe' : 'Add your own recipe'}</DialogTitle>
          <DialogDescription>
            Save family favourites — grandma&apos;s biryani, your Eid cookies — and plan them like any
            other recipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="r-name">Name</Label>
              <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="r-desc">Short description</Label>
              <Input id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-cuisine">Cuisine</Label>
              <Input
                id="r-cuisine"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="e.g. Moroccan"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Meal</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as UserRecipe['meal_type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as UserRecipe['difficulty'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="r-prep">Prep (min)</Label>
                <Input id="r-prep" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-cook">Cook (min)</Label>
                <Input id="r-cook" inputMode="numeric" value={cook} onChange={(e) => setCook(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-serv">Serves</Label>
                <Input id="r-serv" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ingredients</Label>
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={l.quantity}
                  onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  placeholder="2"
                  className="w-16"
                  aria-label="Quantity"
                />
                <Input
                  value={l.unit}
                  onChange={(e) => updateLine(i, { unit: e.target.value })}
                  placeholder="cups"
                  className="w-24"
                  aria-label="Unit"
                />
                <Input
                  value={l.name}
                  onChange={(e) => updateLine(i, { name: e.target.value })}
                  placeholder="basmati rice"
                  aria-label="Ingredient"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={lines.length === 1}
                  aria-label="Remove ingredient"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, { name: '', quantity: '', unit: '' }])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add ingredient
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-steps">Method — one step per line</Label>
            <Textarea id="r-steps" value={steps} onChange={(e) => setSteps(e.target.value)} rows={6} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-tips">Tips (optional)</Label>
            <Textarea id="r-tips" value={tips} onChange={(e) => setTips(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-img">Photo link (optional)</Label>
            <Input
              id="r-img"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="r-public" className="text-sm">
                Share with the Firdam community
              </Label>
              <p className="text-xs text-muted-foreground">Other families can find and cook it.</p>
            </div>
            <Switch id="r-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {recipe ? 'Save changes' : 'Save recipe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
