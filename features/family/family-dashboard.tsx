'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { FamilyMembersList } from '@/features/family/family-members-list';
import {
  FamilyMemberFormDialog,
  emptyMemberValues,
  type FamilyMemberFormValues,
} from '@/features/family/family-member-form-dialog';

export function FamilyDashboard() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FamilyMemberFormValues>(emptyMemberValues());

  useEffect(() => {
    if (open) setValues(emptyMemberValues());
  }, [open]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('family-open-add', handler);
    return () => window.removeEventListener('family-open-add', handler);
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Family"
        description="Manage your household members and keep track of everyone in one place."
      >
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </PageHeader>

      <FamilyMembersList />

      <FamilyMemberFormDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        values={values}
        onValuesChange={setValues}
      />
    </AppShell>
  );
}
