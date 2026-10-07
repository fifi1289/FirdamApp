'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { BudgetCategory, BudgetTransaction, TransactionType } from '@/types/database';
import { TRANSACTION_TYPES, todayISO } from '@/features/budget/budget-config';

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetCategory[];
  currency: string;
  /** Edit an existing entry, or prefill a new one. */
  initial?: Partial<BudgetTransaction> | null;
  onSaved: () => void;
}

const NO_CATEGORY = '__none__';

export function TransactionDialog({
  open,
  onOpenChange,
  categories,
  currency,
  initial,
  onSaved,
}: TransactionDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (!open) return;
    setType(initial?.type ?? 'expense');
    setAmount(initial?.amount ? String(initial.amount) : '');
    setCategoryId(initial?.category_id ?? NO_CATEGORY);
    setDescription(initial?.description ?? '');
    setDate(initial?.occurred_on ?? todayISO());
  }, [open, initial]);

  const save = async () => {
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }
    const row = {
      type,
      amount: Math.round(value * 100) / 100,
      category_id: type === 'expense' && categoryId !== NO_CATEGORY ? categoryId : null,
      description: description.trim() || null,
      occurred_on: date || todayISO(),
    };
    setSaving(true);
    const { error } = editing
      ? await supabase.from('budget_transactions').update(row).eq('id', initial!.id!)
      : await supabase.from('budget_transactions').insert(row);
    setSaving(false);
    if (error) {
      toast.error('Could not save', { description: error.message });
      return;
    }
    toast.success(
      type === 'sadaqah' || type === 'zakat'
        ? 'Recorded. May Allah accept it from you.'
        : editing
          ? 'Entry updated'
          : 'Entry added'
    );
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit entry' : 'Add an entry'}</DialogTitle>
          <DialogDescription>Track spending, income and giving in {currency}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
            {TRANSACTION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  'rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  type === t.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            {TRANSACTION_TYPES.find((t) => t.value === type)?.hint}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {type === 'expense' && (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Uncategorised</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Note (optional)</Label>
            <Input
              id="tx-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'sadaqah'
                  ? 'e.g. Masjid building fund'
                  : type === 'zakat'
                    ? 'e.g. Zakat 1448 AH'
                    : type === 'income'
                      ? 'e.g. Salary'
                      : 'e.g. Halal butcher'
              }
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? 'Save changes' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
