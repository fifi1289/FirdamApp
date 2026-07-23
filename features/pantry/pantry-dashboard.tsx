'use client';

import { Plus, Archive } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PantryDashboard() {
  return (
    <AppShell>
      <PageHeader
        title="Pantry"
        description="Keep track of your household food inventory so you always know what you have on hand."
      >
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </PageHeader>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Archive className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            Your pantry is empty
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Add your first item to start managing your household food inventory and reduce waste.
          </p>
          <Button size="sm" className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Add your first item
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
