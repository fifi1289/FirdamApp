'use client';

import { useState } from 'react';
import { Plus, Users } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function FamilyDashboard() {
  const [open, setOpen] = useState(false);

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

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            No household members yet
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Add your first family member to start managing your household and keeping everyone in sync.
          </p>
          <Button
            size="sm"
            className="mt-6"
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add your first member
          </Button>
        </CardContent>
      </Card>

      {open && (
        <p className="mt-4 text-xs text-muted-foreground">
          Member management is coming soon.
        </p>
      )}
    </AppShell>
  );
}
