'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PantryItemsList } from '@/features/pantry/pantry-items-list';
import { PantryCheckDialog, PantrySetupDialog, QuickAddBar, RecentChanges } from '@/features/pantry/pantry-tools';
import {
  PantryItemFormDialog,
  emptyItemValues,
  type PantryItemFormValues,
} from '@/features/pantry/pantry-item-form-dialog';

export function PantryDashboard() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PantryItemFormValues>(emptyItemValues());
  const [setupOpen, setSetupOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('check') === '1') setCheckOpen(true);
    const openSetup = () => setSetupOpen(true);
    window.addEventListener('pantry-open-setup', openSetup);
    return () => window.removeEventListener('pantry-open-setup', openSetup);
  }, []);

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
        description="What you have at home. Cooking, shopping and the weekly check keep it up to date for you."
      >
        <Button size="sm" variant="outline" onClick={() => setCheckOpen(true)}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Weekly check
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4" />
          Quick setup
        </Button>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </PageHeader>

      <QuickAddBar />

      <PantryItemsList />

      <RecentChanges />

      <PantrySetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
      <PantryCheckDialog open={checkOpen} onOpenChange={setCheckOpen} />

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
