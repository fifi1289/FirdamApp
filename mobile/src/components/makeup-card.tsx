import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import { askForAlerts } from '@/lib/adhan-alerts';
import { scheduleEventAlerts } from '@/lib/event-alerts';
import { loadMakeup, saveMakeup } from '@/lib/makeup';
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
} from '@/shared/makeup-core';
import { colors } from '@/theme';

const monthYear = (year: number) =>
  RAMADAN_STARTS[year] ? new Date(`${RAMADAN_STARTS[year]}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';

/** Days to make up (qada) from Ramadan, the same as Fasting on firdam.com. Private to you. */
export function MakeupCard() {
  const [records, setRecords] = useState<MakeupRecord[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const current = currentRamadanYear();

  const load = useCallback(() => {
    loadMakeup().then(setRecords);
  }, []);
  useEffect(load, [load]);

  const save = async (next: MakeupRecord) => {
    setProblem(null);
    setRecords((prev) => [...(prev ?? []).filter((r) => r.ramadan_year !== next.ramadan_year), next].sort((a, b) => a.ramadan_year - b.ramadan_year));
    try {
      await saveMakeup(next);
      // The first time days are logged, ask to allow the reminders before Ramadan.
      if (remaining(next) > 0) await askForAlerts().catch(() => false);
      scheduleEventAlerts().catch(() => {});
    } catch {
      setProblem('Couldn’t save. Check your connection and try again.');
      load();
    }
  };

  if (!records) return null;

  const shown = [
    ...records.filter((r) => r.ramadan_year < current && remaining(r) > 0),
    records.find((r) => r.ramadan_year === current) ?? { ramadan_year: current, missed: 0, made_up: [] },
  ];
  const summary = makeupSummary(records);
  const next = nextRamadan();

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <T weight="bold" size={16}>
          Days to make up
        </T>
        <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>
          {MAKEUP_NOTE}
        </T>
      </View>

      {shown.map((r) => (
        <MakeupRow key={r.ramadan_year} record={r} label={`RAMADAN ${r.ramadan_year} · ${monthYear(r.ramadan_year).toUpperCase()}`} onChange={save} />
      ))}

      {problem ? (
        <T size={13} color={colors.brickText}>
          {problem}
        </T>
      ) : null}

      <T size={14} weight="semibold">
        {summary ?? (next ? `All caught up, alhamdulillah. Next Ramadan in ${next.daysAway} days.` : 'All caught up, alhamdulillah.')}
      </T>
      {summary ? (
        <T size={12.5} color={colors.muted}>
          We’ll remind you a month and a week before Ramadan.
        </T>
      ) : null}
      <T size={12} color={colors.muted}>
        🔒 Only you can see this. It isn’t shared with your family.
      </T>
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
    <View style={styles.row}>
      <T size={12} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        {label}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T size={14.5}>Days I didn’t fast</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Step label="−" a11y="One day less" disabled={record.missed <= done} onPress={() => onChange({ ...record, missed: record.missed - 1 })} />
          <T size={20} weight="extrabold" style={{ minWidth: 26, textAlign: 'center' }}>
            {String(record.missed)}
          </T>
          <Step label="+" a11y="One day more" disabled={record.missed >= 30} onPress={() => onChange({ ...record, missed: record.missed + 1 })} />
        </View>
      </View>

      {record.missed > 0 ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={13.5}>{`Made up ${done} of ${record.missed}`}</T>
            <T size={13.5} color={colors.muted}>
              {left ? `${left} left` : 'Done ✓'}
            </T>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(done / record.missed) * 100}%` }]} />
          </View>
          <Button
            label={loggedToday ? 'Today is logged ✓' : 'I made up a fast today'}
            onPress={() => onChange({ ...record, made_up: [...record.made_up, today].sort() })}
            disabled={!left || loggedToday || blocked}
          />
          {done > 0 ? (
            <Button label="Undo last" variant="text" onPress={() => onChange({ ...record, made_up: record.made_up.slice(0, -1) })} style={{ height: 36 }} />
          ) : null}
          {blocked ? (
            <T size={12.5} color={colors.muted}>
              Make-up fasts are logged after Ramadan.
            </T>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function Step({ label, a11y, disabled, onPress }: { label: string; a11y: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[styles.step, disabled && { opacity: 0.4 }]}
    >
      <T size={18} weight="bold" color={colors.walnut}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14 },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.tint, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.walnut },
});
