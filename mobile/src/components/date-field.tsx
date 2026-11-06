import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { isRTL, locale, tr } from '@/lib/i18n';
import { colors, radius } from '@/theme';

/**
 * A date field that opens a calendar instead of asking people to type
 * YYYY-MM-DD. Plain JavaScript (no native module), so it works in every build.
 * The value stays a "YYYY-MM-DD" string ('' when empty), like the old text fields.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parse(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

/** "6 février 2027", "February 6, 2027", "٦ فبراير ٢٠٢٧" (Western digits in Arabic). */
export function formatDay(value: string): string {
  const p = parse(value);
  if (!p) return '';
  return new Date(p.y, p.m, p.d, 12).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
}

export function DateField({
  label,
  value,
  onChange,
  optional,
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Shows a "Clear" button. */
  optional?: boolean;
  placeholder?: string;
  /** Earliest / latest allowed day, as YYYY-MM-DD. */
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = formatDay(value);

  return (
    <View style={{ gap: 6 }}>
      <T weight="semibold" size={14}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown || tr('Choose a date')}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.7 }]}
      >
        <T size={16} color={shown ? colors.espresso : '#9C8D84'} numberOfLines={1} style={{ flex: 1 }}>
          {shown || placeholder || tr('Choose a date')}
        </T>
        <T size={16} color={colors.walnut}>
          📅
        </T>
      </Pressable>
      {open && (
        <CalendarModal
          title={label}
          value={value}
          min={min}
          max={max}
          optional={optional}
          onClose={() => setOpen(false)}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </View>
  );
}

function CalendarModal({
  title,
  value,
  min,
  max,
  optional,
  onClose,
  onPick,
}: {
  title: string;
  value: string;
  min?: string;
  max?: string;
  optional?: boolean;
  onClose: () => void;
  onPick: (v: string) => void;
}) {
  const today = new Date();
  const start = parse(value) ?? parse(min ?? '') ?? { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
  const [y, setY] = useState(start.y);
  const [m, setM] = useState(start.m);
  const [pickYear, setPickYear] = useState(false);
  const rtl = isRTL();

  const loc = locale();
  const monthName = new Date(y, m, 1, 12).toLocaleDateString(loc, { month: 'long', year: 'numeric' });
  // Weekday initials starting on Sunday (Jan 4, 1970 was a Sunday).
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(1970, 0, 4 + i, 12).toLocaleDateString(loc, { weekday: 'narrow' })),
    [loc],
  );

  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const move = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setY(d.getFullYear());
    setM(d.getMonth());
  };

  const years = useMemo(() => {
    const lo = min ? Number(min.slice(0, 4)) : today.getFullYear() - 100;
    const hi = max ? Number(max.slice(0, 4)) : today.getFullYear() + 10;
    return Array.from({ length: hi - lo + 1 }, (_, i) => hi - i);
  }, [min, max]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={tr('Close')}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <T weight="bold" size={17} style={{ marginBottom: 10 }}>
            {title}
          </T>

          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel={tr('Previous month')} onPress={() => move(-1)} style={styles.nav} hitSlop={8}>
              <T size={20} color={colors.walnut}>{rtl ? '›' : '‹'}</T>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={tr('Choose the year')} onPress={() => setPickYear((v) => !v)}>
              <T weight="bold" size={16}>
                {monthName} ▾
              </T>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={tr('Next month')} onPress={() => move(1)} style={styles.nav} hitSlop={8}>
              <T size={20} color={colors.walnut}>{rtl ? '‹' : '›'}</T>
            </Pressable>
          </View>

          {pickYear ? (
            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={styles.years}>
              {years.map((yr) => (
                <Pressable
                  key={yr}
                  accessibilityRole="button"
                  onPress={() => {
                    setY(yr);
                    setPickYear(false);
                  }}
                  style={[styles.year, yr === y && styles.selected]}
                >
                  <T size={15} weight={yr === y ? 'bold' : 'regular'} color={yr === y ? colors.white : colors.espresso}>
                    {String(yr)}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <>
              <View style={styles.row}>
                {weekdays.map((w, i) => (
                  <View key={i} style={styles.cell}>
                    <T size={12.5} color={colors.muted}>
                      {w}
                    </T>
                  </View>
                ))}
              </View>
              {Array.from({ length: cells.length / 7 }, (_, r) => (
                <View key={r} style={styles.row}>
                  {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                    if (!d) return <View key={i} style={styles.cell} />;
                    const iso = toISO(y, m, d);
                    const on = iso === value;
                    const ok = allowed(iso);
                    return (
                      <Pressable
                        key={i}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on, disabled: !ok }}
                        accessibilityLabel={formatDay(iso)}
                        disabled={!ok}
                        onPress={() => onPick(iso)}
                        style={styles.cell}
                      >
                        <View style={[styles.day, on && styles.selected, !on && iso === todayISO && styles.today]}>
                          <T size={15} weight={on ? 'bold' : 'regular'} color={on ? colors.white : ok ? colors.espresso : '#C9BDB4'}>
                            {String(d)}
                          </T>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </>
          )}

          <View style={styles.footer}>
            {optional && value ? (
              <Pressable accessibilityRole="button" onPress={() => onPick('')} hitSlop={8}>
                <T weight="semibold" color={colors.walnut}>
                  {tr('Clear')}
                </T>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
              <T weight="semibold" color={colors.walnut}>
                {tr('Cancel')}
              </T>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(43,33,27,0.4)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.linen, borderRadius: 22, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.tint },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.walnut },
  today: { borderWidth: 1.5, borderColor: colors.gold },
  years: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  year: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.tint },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
});

