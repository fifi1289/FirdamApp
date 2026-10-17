'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BudgetCategory } from '@/types/database';
import { parseAmount } from '@/features/budget/finance-core';

/**
 * Add, rename or remove a spending category and set its monthly limit — the
 * same choices as the category sheet in the phone app.
 */
export function CategoryDialog({
  open,
  category,
  currency,
  onOpenChange,
  onSave,
  onDelete,
  onAddExpense,
}: {
  open: boolean;
  /** null = a new category. */
  category: BudgetCategory | null;
  currency: string;
  onOpenChange: (open: boolean) => void;
  onSave: (values: { name: string; monthly_limit: number | null }) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddExpense: () => void;
}) {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setLimit(category?.monthly_limit ? String(category.monthly_limit) : '');
    setProblem(null);
    setBusy(false);
    setConfirmDelete(false);
  }, [open, category]);

  const save = async () => {
    if (!name.trim()) return setProblem('Give the category a name.');
    setBusy(true);
    try {
      await onSave({ name: name.trim(), monthly_limit: parseAmount(limit) || null });
      onOpenChange(false);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not save the category.');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not delete the category.');
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>
            {category ? 'Rename it, change its monthly limit or remove it.' : 'Add a category for your family’s spending, like Zakat savings or Car.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input id="category-name" value={name} onChange={(e) => { setName(e.target.value); setProblem(null); }} placeholder="Car" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-limit">Monthly limit ({currency}, optional)</Label>
            <Input id="category-limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="600" />
          </div>
          {problem && <p className="text-sm text-destructive">{problem}</p>}
          {category && (
            <Button type="button" variant="outline" className="w-full" onClick={() => { onOpenChange(false); onAddExpense(); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add an expense in {category.name}
            </Button>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {category ? (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove} disabled={busy}>
              <Trash2 className="mr-2 h-4 w-4" />
              {confirmDelete ? 'Click again to delete' : 'Delete'}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
        {confirmDelete && (
          <p className="text-xs text-muted-foreground">Its entries stay in your history, without a category.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
