'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Lock, Minus, Plus, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  MAKEUP_NOTE,
  RAMADAN_STARTS,
  currentRamadanYear,
  insideRamadan,
  isoDate,
  makeupSummary,
  nextRamadan,
  remaining,
  type MakeupRecord,
} from '@/features/fasting/makeup-core';

const monthYear = (year: number) =>
  RAMADAN_STARTS[year] ? new Date(`${RAMADAN_STARTS[year]}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';

/** Days to make up (qada) from Ramadan, the same as Fasting in the Firdam app. Private to the signed-in person. */
export function MakeupCard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [records, setRecords] = useState<MakeupRecord[] | null>(null);
  const current = currentRamadanYear();

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('fast_makeup').select('ramadan_year, missed, made_up').order('ramadan_year');
    setRecords(error ? [] : (data ?? []));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (next: MakeupRecord) => {
    setRecords((prev) => {
      const rest = (prev ?? []).filter((r) => r.ramadan_year !== next.ramadan_year);
      return [...rest, next].sort((a, b) => a.ramadan_year - b.ramadan_year);
    });
    const { error } = await supabase
      .from('fast_makeup')
      .upsert({ ramadan_year: next.ramadan_year, missed: next.missed, made_up: next.made_up, updated_at: new Date().toISOString() }, { onConflict: 'user_id,ramadan_year' });
    if (error) {
      toast.error('Could not save', { description: 'Check your connection and try again.' });
      load();
    }
  };

  if (!records) return null;

  // The Ramadan just past (or under way), plus any older one with days still left.
  const shown = [
    ...records.filter((r) => r.ramadan_year < current && remaining(r) > 0),
    records.find((r) => r.ramadan_year === current) ?? { ramadan_year: current, missed: 0, made_up: [] },
  ];
  const summary = makeupSummary(records);
  const next = nextRamadan();

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <CalendarCheck className="h-4 w-4 text-primary" /> Days to make up
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{MAKEUP_NOTE}</p>
        </div>

        {shown.map((r) => (
          <MakeupRow key={r.ramadan_year} record={r} label={`Ramadan ${r.ramadan_year} · ${monthYear(r.ramadan_year)}`} onChange={save} />
        ))}

        <p className="text-sm font-medium text-foreground">
          {summary ?? (next ? `All caught up, alhamdulillah. Next Ramadan in ${next.daysAway} days.` : 'All caught up, alhamdulillah.')}
        </p>
        {summary && (
          <p className="text-xs text-muted-foreground">We’ll remind you a month and a week before Ramadan.</p>
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Only you can see this. It isn’t shared with your family.
        </p>
      </CardContent>
    </Card>
  );
}

function MakeupRow({ record, label, onChange }: { record: MakeupRecord; label: string; onChange: (r: MakeupRecord) => void }) {
  const today = isoDate(new Date());
  const done = record.made_up.length;
  const left = remaining(record);
  const loggedToday = record.made_up.includes(today);
  const blocked = insideRamadan(today);

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">Days I didn’t fast</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="One day less"
            disabled={record.missed <= done}
            onClick={() => onChange({ ...record, missed: record.missed - 1 })}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-display text-lg font-bold text-foreground" aria-live="polite">
            {record.missed}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="One day more"
            disabled={record.missed >= 30}
            onClick={() => onChange({ ...record, missed: record.missed + 1 })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {record.missed > 0 && (
        <>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground">{`Made up ${done} of ${record.missed}`}</span>
              <span className="text-muted-foreground">{left ? `${left} left` : 'Done ✓'}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / record.missed) * 100}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!left || loggedToday || blocked}
              onClick={() => onChange({ ...record, made_up: [...record.made_up, today].sort() })}
            >
              {loggedToday ? 'Today is logged ✓' : 'I made up a fast today'}
            </Button>
            {done > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...record, made_up: record.made_up.slice(0, -1) })}
              >
                <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo last
              </Button>
            )}
          </div>
          {blocked && <p className="text-xs text-muted-foreground">Make-up fasts are logged after Ramadan.</p>}
        </>
      )}
    </div>
  );
}
