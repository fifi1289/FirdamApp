'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Receipt, Sparkles } from 'lucide-react';
import { ReceiptScanDialog } from '@/features/pantry/receipt-scan-dialog';
import { PremiumBadge } from '@/components/plan/upgrade-prompt';
import { usePlan } from '@/lib/plan/plan';

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
  const [scanOpen, setScanOpen] = useState(false);
  const { isPaid } = usePlan();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('check') === '1') setCheckOpen(true);
    if (params.get('scan') === '1') setScanOpen(true);
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
        <Button size="sm" variant="outline" onClick={() => setScanOpen(true)}>
          <Receipt className="mr-2 h-4 w-4" />
          Scan receipt
          {!isPaid && <PremiumBadge className="ml-2" />}
        </Button>
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
      <ReceiptScanDialog open={scanOpen} onOpenChange={setScanOpen} />

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
