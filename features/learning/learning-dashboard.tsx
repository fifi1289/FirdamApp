'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookOpenText, GraduationCap, Languages, Users } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NoPartnersHere, PartnerCard, usePartnerShops, useVisiblePartners } from '@/features/groceries/partner-shops';
import { LEARNING_NOTE, learningPartners, learningTopicsInUse, matchesWorks } from '@/features/groceries/partners';
import { PartnerFilters, type WorksFilter } from '@/features/partners/partner-filters';

const COMING = [
  { icon: BookOpenText, title: 'Quran & tajweed', text: 'Online and local teachers for reading, tajweed and hifz.' },
  { icon: Languages, title: 'Arabic', text: 'Classes for kids and adults, from the alphabet to fluency.' },
  { icon: GraduationCap, title: 'Islamic studies & hadith', text: 'Courses, halaqas and weekend Islamic schools.' },
  { icon: Users, title: 'For every family member', text: 'Kids’ programs, sisters-only classes and family courses.' },
];

/** Learning: trusted Quran, Arabic and Islamic studies teachers, the same as in the Firdam app. */
export function LearningDashboard() {
  const allShops = usePartnerShops();
  const [works, setWorks] = useState<WorksFilter>(null);
  const shops = useVisiblePartners(allShops).filter((s) => matchesWorks(s, works));
  const [topic, setTopic] = useState<string | null>(null);
  const topics = learningTopicsInUse(allShops);
  const all = learningPartners(allShops);
  const list = learningPartners(shops, topic);

  return (
    <AppShell>
      <PageHeader
        title="Learning"
        description="Learn Quran, tajweed, Arabic, hadith and more with trusted teachers and Islamic schools, for kids and adults."
      />

      {all.length > 0 && <PartnerFilters shops={allShops} works={works} onWorks={setWorks} />}
      {all.length > 0 ? (
        <div className="space-y-4">
          {topics.length > 1 && (
            <nav aria-label="Topics" className="flex flex-wrap gap-2">
              {[null, ...topics].map((t) => (
                <button
                  key={t ?? 'all'}
                  type="button"
                  onClick={() => setTopic(t)}
                  aria-pressed={topic === t}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                    topic === t ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-primary/40'
                  )}
                >
                  {t ?? 'All'}
                </button>
              ))}
            </nav>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Learning partners</p>
          {list.length ? list.map((s) => <PartnerCard key={s.id} shop={s} />) : <NoPartnersHere what="learning partners" />}
          <p className="text-xs text-muted-foreground">{LEARNING_NOTE}</p>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="font-semibold text-foreground">Teachers and schools are joining soon, insha’Allah</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We’re partnering with trusted teachers so your family can learn in one place.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {COMING.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-border p-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Meanwhile, keep reading with{' '}
              <Link href="/dashboard/quran" className="font-semibold text-primary underline-offset-2 hover:underline">
                Quran &amp; Duas
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        Teach Quran, Arabic or Islamic studies?{' '}
        <Link href="/partners" className="font-semibold text-primary underline-offset-2 hover:underline">
          Become a Firdam learning partner
        </Link>
        , free for founding partners.
      </p>
    </AppShell>
  );
}
