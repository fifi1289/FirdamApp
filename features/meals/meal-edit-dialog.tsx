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

  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setDescription(meal.description);
    }
  }, [meal]);

  const handleSave = () => {
    if (!meal) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Meal name is required');
      return;
    }
    onSave({ ...meal, name: trimmedName, description: description.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Meal</DialogTitle>
          <DialogDescription>
            Update the meal name and description for this entry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
