'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Sparkles, Utensils } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DEFAULT_PREFERENCES,
  type MealPreferencesState,
} from '@/features/meals/meals-config';
import { MealPreferencesForm } from '@/features/meals/meal-preferences-form';

type View = 'home' | 'preferences';

export function MealsDashboard() {
  const supabase = createSupabaseBrowserClient();
  const [view, setView] = useState<View>('home');
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<MealPreferencesState>(
    DEFAULT_PREFERENCES
  );

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('meal_preferences')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Failed to load meal preferences:', error.message);
      }
      if (data) {
        setPreferences({
          planningDuration: data.planning_duration,
          mealTypes: data.meal_types,
          usePantryFirst: data.use_pantry_first,
          dietaryPreferences: data.dietary_preferences,
          allergies: data.allergies,
        });
      }
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <AppShell>
      {view === 'preferences' ? (
        <>
          <PageHeader
            title="Meal Planner"
            description="Plan and organize your family's meals."
          />
          <MealPreferencesForm
            initial={preferences}
            onCancel={() => setView('home')}
          />
        </>
      ) : (
        <>
          <PageHeader
            title="Meal Planner"
            description="Plan and organize your family's meals."
          >
            <Button size="sm" onClick={() => setView('preferences')}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New Meal Plan
            </Button>
          </PageHeader>

          <div className="space-y-8">
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarDays className="h-7 w-7" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-foreground">
                  No meal plans yet
                </h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Generate your first meal plan to start organizing your
                  family&apos;s weekly menu.
                </p>
                <Button
                  size="sm"
                  className="mt-6"
                  onClick={() => setView('preferences')}
                  disabled={loading}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate New Meal Plan
                </Button>
              </CardContent>
            </Card>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Recent Meal Plans
                </h2>
              </div>
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Your generated meal plans will appear here.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
