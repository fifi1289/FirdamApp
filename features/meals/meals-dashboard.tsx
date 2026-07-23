'use client';

import { useState } from 'react';
import { Plus, Utensils } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function MealsDashboard() {
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader
        title="Meal Planner"
        description="Plan and organize your family's meals."
      >
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Meal
        </Button>
      </PageHeader>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Utensils className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            No meals planned yet
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Add your first meal to start planning your family&apos;s weekly menu.
          </p>
          <Button size="sm" className="mt-6" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first meal
          </Button>
        </CardContent>
      </Card>

      {open && (
        <p className="mt-4 text-xs text-muted-foreground">
          Meal creation is coming soon.
        </p>
      )}
    </AppShell>
  );
}
