import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import type { PantryItem } from '@/lib/db-types';
import { patchKitchen, refreshKitchen, useKitchen } from '@/lib/kitchen-store';
import { supabase } from '@/lib/supabase';
import { groupByAisle, guessCategory, parseQuickAdd, toPantryUnit } from '@/shared/grocery-utils';
import { haramItemMessage } from '@/shared/halal';
import { formatAmount } from '@/shared/pantry-units';
import { colors, fonts } from '@/theme';

const DAY = 24 * 60 * 60 * 1000;

function daysLeft(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00`).getTime();
  return Math.round((d - Date.now()) / DAY);
}

function amount(i: PantryItem): string {
  if (i.tracking === 'level') return i.level === 'low' ? 'running low' : i.level === 'out' ? 'out' : i.level ?? 'some';
  return formatAmount(i.quantity, i.unit === 'Pieces' ? 'pieces' : i.unit);
}

/** The family pantry: add food, mark it used up, and see what to use soon. */
export function PantryView() {
  const k = useKitchen();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const soon = useMemo(
    () =>
      k.pantry
        .map((i) => ({ i, d: daysLeft(i.expiration_date) }))
        .filter((x) => x.d != null && x.d <= 3)
        .sort((a, b) => (a.d ?? 0) - (b.d ?? 0)),
    [k.pantry],
  );
  const groups = useMemo(() => groupByAisle(k.pantry as never), [k.pantry]) as unknown as { category: string; items: PantryItem[] }[];

  const add = async () => {
    const value = text.trim();
    if (!value) return;
    const parsed = value.split(/,|\n/).map((s) => s.trim()).filter(Boolean).map(parseQuickAdd);
    const refused = parsed.map((p) => haramItemMessage(p.name)).filter((m): m is string => !!m);
    const rows = parsed
      .filter((p) => !haramItemMessage(p.name))
      .map((p) => ({
        name: p.name.replace(/^\w/, (c) => c.toUpperCase()),
        category: guessCategory(p.name),
        quantity: p.quantity ?? 1,
        unit: toPantryUnit(p.unit),
        tracking: 'count' as const,
      }));
    setBusy(true);
    try {
      if (rows.length) {
        const { error } = await supabase.from('pantry_items').insert(rows);
        if (error) throw error;
      }
      if (refused.length) Alert.alert('Not added', refused.join('\n\n'));
      setText('');
      await refreshKitchen();
    } catch (e) {
      Alert.alert('Could not add', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const usedUp = (item: PantryItem) => {
    Alert.alert(`Used up ${item.name}?`, 'It will be removed from your pantry.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Used up',
        style: 'destructive',
        onPress: async () => {
          Haptics.selectionAsync().catch(() => {});
          patchKitchen({ pantry: k.pantry.filter((p) => p.id !== item.id) });
          const { error } = await supabase.from('pantry_items').delete().eq('id', item.id);
          if (error) await refreshKitchen();
        },
      },
    ]);
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add: 2 kg rice, 6 eggs…"
          placeholderTextColor="#9C8D84"
          accessibilityLabel="Add to the pantry"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <Button label="Add" onPress={add} busy={busy} style={{ height: 48, paddingHorizontal: 18 }} />
      </View>

      {soon.length ? (
        <Card style={{ gap: 8 }}>
          <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
            USE SOON
          </T>
          {soon.map(({ i, d }) => (
            <View key={i.id} style={styles.soonRow}>
              <T size={15} weight="semibold" style={{ flex: 1 }}>
                {i.name}
              </T>
              <Badge label={d! < 0 ? 'Past its date' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`} tone={d! <= 0 ? 'brick' : 'amber'} />
            </View>
          ))}
        </Card>
      ) : null}

      {k.pantry.length === 0 ? (
        <Card>
          <T size={14.5} color={colors.muted}>
            Your pantry is empty. Add what you have at home, and the Plan and Recipes will show what you can cook and what to buy.
          </T>
        </Card>
      ) : (
        groups.map((g) => (
          <View key={g.category} style={{ gap: 6 }}>
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              {g.category.toUpperCase()}
            </T>
            <Card style={{ paddingVertical: 2 }}>
              {g.items.map((i, idx) => (
                <Pressable
                  key={i.id}
                  accessibilityRole="button"
                  accessibilityHint="Mark as used up"
                  onLongPress={() => usedUp(i)}
                  onPress={() => usedUp(i)}
                  style={[styles.row, idx < g.items.length - 1 && styles.line]}
                >
                  <T size={15} weight="semibold" style={{ flex: 1 }}>
                    {i.name}
                  </T>
                  <T size={13} color={colors.muted}>
                    {amount(i)}
                  </T>
                </Pressable>
              ))}
            </Card>
          </View>
        ))
      )}
      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        Tap an item when it’s used up. Receipt scanning and more pantry tools are on firdam.com.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.espresso },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
  soonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
