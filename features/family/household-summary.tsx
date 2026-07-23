'use client';

import { Baby, PersonStanding, Users, UserRound } from 'lucide-react';
import type { FamilyMember } from '@/types/database';
import { cn } from '@/lib/utils';

function ageFromBirthDate(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const birth = new Date(y, m - 1, d);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age < 0 ? null : age;
}

interface SummaryCardProps {
  icon: typeof Users;
  label: string;
  value: number;
  accent: string;
}

function SummaryCard({ icon: Icon, label, value, accent }: SummaryCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
      <span
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          accent
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none text-foreground tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function HouseholdSummary({ members }: { members: FamilyMember[] }) {
  const total = members.length;
  let adults = 0;
  let children = 0;
  let babies = 0;

  for (const member of members) {
    const age = ageFromBirthDate(member.birth_date);
    if (age === null) continue;
    if (age >= 18) adults += 1;
    else if (age >= 2) children += 1;
    else babies += 1;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCard
        icon={Users}
        label="Total Members"
        value={total}
        accent="bg-primary/10 text-primary"
      />
      <SummaryCard
        icon={UserRound}
        label="Adults (18+)"
        value={adults}
        accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      />
      <SummaryCard
        icon={PersonStanding}
        label="Children (2–17)"
        value={children}
        accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
      />
      <SummaryCard
        icon={Baby}
        label="Babies (0–1)"
        value={babies}
        accent="bg-amber-500/10 text-amber-700 dark:text-amber-300"
      />
    </div>
  );
}
