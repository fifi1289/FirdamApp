'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PantryItemsList } from '@/features/pantry/pantry-items-list';
import {
  PantryItemFormDialog,
  emptyItemValues,
  type PantryItemFormValues,
} from '@/features/pantry/pantry-item-form-dialog';

export function PantryDashboard() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PantryItemFormValues>(emptyItemValues());

  useEffect(() => {
    if (open) setValues(emptyItemValues());
  }, [open]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('pantry-open-add', handler);
    return () => window.removeEventListener('pantry-open-add', handler);
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Pantry"
        description="Keep track of your household food inventory so you always know what you have on hand."
      >
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </PageHeader>

      <PantryItemsList />

      <PantryItemFormDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        values={values}
        onValuesChange={setValues}
      />
    </AppShell>
  );
}
