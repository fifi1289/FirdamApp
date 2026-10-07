'use client';

import { useEffect, useState } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DuasView } from '@/features/quran/duas-view';
import { QuranReading } from '@/features/quran/quran-reading';

export function QuranDashboard() {
  const [tab, setTab] = useState('duas');

  // Deep link: /dashboard/quran?tab=reading
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'reading' || t === 'duas') setTab(t);
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Quran & Duas"
        description="Duas for every moment of the day, and a gentle tracker for your Quran reading."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="duas">Daily duas</TabsTrigger>
          <TabsTrigger value="reading">Quran reading</TabsTrigger>
        </TabsList>
        <TabsContent value="duas" className="mt-0">
          <DuasView />
        </TabsContent>
        <TabsContent value="reading" className="mt-0">
          <QuranReading />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
