'use client';

import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  type PantryCategory,
  type PantryUnit,
} from '@/types/database';
import type { PantryItem } from '@/types/database';

export interface PantryItemFormValues {
  name: string;
  category: PantryCategory;
  quantity: string;
  unit: PantryUnit;
  expiration_date: string;
  notes: string;
}

export function emptyItemValues(): PantryItemFormValues {
  return {
    name: '',
    category: 'Other',
    quantity: '1',
    unit: 'Pieces',
    expiration_date: '',
    notes: '',
  };
}

export function itemToValues(item: PantryItem): PantryItemFormValues {
  return {
    name: item.name,
    category: item.category,
    quantity: String(item.quantity),
    unit: item.unit,
    expiration_date: item.expiration_date ?? '',
    notes: item.notes ?? '',
  };
}

export const PANTRY_ITEMS_CHANGED = 'pantry-items-changed';

interface PantryItemFormDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: PantryItemFormValues;
  onValuesChange: (values: PantryItemFormValues) => void;
  trigger?: React.ReactNode;
  item?: PantryItem;
}

export function PantryItemFormDialog({
  mode,
  open,
  onOpenChange,
  values,
  onValuesChange,
  trigger,
  item,
}: PantryItemFormDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit';
  const update = (patch: Partial<PantryItemFormValues>) =>
    onValuesChange({ ...values, ...patch });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = values.name.trim();
    if (!trimmed) return;

    const qty = Number(values.quantity);
    const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1;

    const payload = {
      name: trimmed,
      category: values.category,
      quantity,
      unit: values.unit,
      expiration_date: values.expiration_date || null,
      notes: values.notes.trim() || null,
    };

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSubmitting(false);
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    const result = isEdit
      ? await supabase.from('pantry_items').update(payload).eq('id', item!.id)
      : await supabase.from('pantry_items').insert(payload);
    setSubmitting(false);

    if (result.error) {
      toast.error(
        isEdit ? 'Could not update item' : 'Could not create item',
        { description: result.error.message }
      );
      return;
    }
    onOpenChange(false);
    toast.success(isEdit ? 'Item updated' : 'Item added to pantry');
    window.dispatchEvent(new Event(PANTRY_ITEMS_CHANGED));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit item' : 'Add pantry item'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the details of this pantry item.'
                : 'Track an item in your household food inventory.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pantry-name">Item name</Label>
              <Input
                id="pantry-name"
                value={values.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Whole wheat bread"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pantry-category">Category</Label>
              <Select
                value={values.category}
                onValueChange={(v) => update({ category: v as PantryCategory })}
              >
                <SelectTrigger id="pantry-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {PANTRY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pantry-quantity">Quantity</Label>
                <Input
                  id="pantry-quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={values.quantity}
                  onChange={(e) => update({ quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pantry-unit">Unit</Label>
                <Select
                  value={values.unit}
                  onValueChange={(v) => update({ unit: v as PantryUnit })}
                >
                  <SelectTrigger id="pantry-unit">
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {PANTRY_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pantry-expiration">
                Expiration date (optional)
              </Label>
              <Input
                id="pantry-expiration"
                type="date"
                value={values.expiration_date}
                onChange={(e) => update({ expiration_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pantry-notes">Notes (optional)</Label>
              <Textarea
                id="pantry-notes"
                value={values.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Add any details about this item"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !values.name.trim()}>
              {submitting
                ? isEdit
                  ? 'Saving…'
                  : 'Adding…'
                : isEdit
                ? 'Save changes'
                : 'Add item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
