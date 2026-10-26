import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Checkbox } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import type { GroceryItem } from '@/lib/db-types';
import { addShoppingItems, markHave, removeCheckedItems, setItemChecked } from '@/lib/kitchen';
import { ingredientKey } from '@/shared/pantry-units';
import type { Line } from '@/shared/pantry-engine';
import { patchKitchen, refreshKitchen, refreshShopping, useKitchen } from '@/lib/kitchen-store';
import { formatQty, groupByAisle, needsHalalSource, parseQuickAdd } from '@/shared/grocery-utils';
import { haramItemMessage } from '@/shared/halal';
import { getCurrency } from '@/lib/finance';
import { AFFILIATE_NOTE, amazonSearchUrl, canBuyOnline, shopsAvailable } from '@/shared/shop-links';
import { colors, fonts } from '@/theme';
import { showAlert } from '@/components/firdam-alert';

export function ShoppingView() {
  const k = useKitchen();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const open = useMemo(() => k.items.filter((i) => !i.checked), [k.items]);
  const done = useMemo(() => k.items.filter((i) => i.checked), [k.items]);
  const groups = useMemo(() => groupByAisle(open), [open]);
  // Amazon.ca links for families who use Canadian dollars (non-fresh items only).
  const [online, setOnline] = useState(false);
  useEffect(() => {
    getCurrency().then((c) => setOnline(shopsAvailable(c))).catch(() => {});
  }, []);

  const add = async () => {
    const value = text.trim();
    if (!value || !k.listId) return;
    setBusy(true);
    try {
      // "2 kg rice, 6 eggs" adds two items.
      const parsed = value.split(/,|\n/).map((s) => s.trim()).filter(Boolean).map(parseQuickAdd);
      // Halal only (the database refuses haram food too).
      const refused = parsed.map((p) => haramItemMessage(p.name)).filter((m): m is string => !!m);
      const halal = parsed.filter((p) => !haramItemMessage(p.name));
      if (halal.length) await addShoppingItems(k.listId, halal, k.items);
      if (refused.length) showAlert('Not added', refused.join('\n\n'));
      setText('');
      await refreshShopping();
    } catch (e) {
      showAlert('Could not add', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: GroceryItem) => {
    Haptics.selectionAsync().catch(() => {});
    // Tick it straight away; the server catches up.
    patchKitchen({ items: k.items.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)) });
    try {
      await setItemChecked(item.id, !item.checked);
      // Ticked = the family has it now: put it in the pantry too.
      if (!item.checked) {
        const existing = k.pantry.find((p) => ingredientKey(p.name) === ingredientKey(item.name)) ?? null;
        await markHave({
          need: { name: item.name, quantity: item.quantity, unit: item.unit ?? '' },
          scaled: item.quantity,
          item: existing,
        } as unknown as Line);
        refreshKitchen().catch(() => {});
      }
    } catch {
      await refreshShopping();
    }
  };

  const clearDone = async () => {
    if (!k.listId) return;
    await removeCheckedItems(k.listId);
    await refreshShopping();
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add: 2 kg rice, 6 eggs…"
          placeholderTextColor="#9C8D84"
          accessibilityLabel="Add to the shopping list"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <Button label="Add" onPress={add} busy={busy} style={{ height: 48, paddingHorizontal: 18 }} />
      </View>

      {open.length === 0 ? (
        <Card>
          <T size={14.5} color={colors.muted}>
            Your list is empty. Add food above, or add what this week’s plan needs from Plan.
          </T>
        </Card>
      ) : (
        groups.map((g) => (
          <View key={g.category} style={{ gap: 6 }}>
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              {g.category.toUpperCase()}
              {needsHalalSource(g.category) ? ' · CHECK IT’S HALAL' : ''}
            </T>
            <Card style={{ paddingVertical: 2 }}>
              {g.items.map((i, idx) => (
                <Pressable key={i.id} accessibilityRole="checkbox" accessibilityState={{ checked: i.checked }} onPress={() => toggle(i)} style={[styles.row, idx < g.items.length - 1 && styles.line]}>
                  <Checkbox checked={i.checked} />
                  <T size={15} weight="semibold" style={{ flex: 1 }}>
                    {i.name}
                  </T>
                  <T size={13} color={colors.muted}>
                    {formatQty(i.quantity, i.unit)}
                  </T>
                  {online && canBuyOnline(g.category) ? (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Find ${i.name} on Amazon.ca`}
                      onPress={() => Linking.openURL(amazonSearchUrl(i.name))}
                      hitSlop={8}
                      style={styles.buy}
                    >
                      <T size={11.5} weight="bold" color={colors.walnut}>
                        Amazon
                      </T>
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
            </Card>
          </View>
        ))
      )}
      {online && groups.some((g) => canBuyOnline(g.category)) ? (
        <T size={12} color={colors.muted} style={{ lineHeight: 17 }}>
          {`“Amazon” opens the item on Amazon.ca. Fresh food isn’t linked: it’s best bought locally. ${AFFILIATE_NOTE}`}
        </T>
      ) : null}

      {done.length ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T size={12.5} weight="bold" color={colors.muted}>
              {`IN THE BASKET · ${done.length}`}
            </T>
            <Button label="Clear" variant="text" onPress={clearDone} style={{ height: 36 }} />
          </View>
          <Card style={{ paddingVertical: 2, opacity: 0.75 }}>
            {done.map((i, idx) => (
              <Pressable key={i.id} accessibilityRole="checkbox" accessibilityState={{ checked: true }} onPress={() => toggle(i)} style={[styles.row, idx < done.length - 1 && styles.line]}>
                <Checkbox checked />
                <T size={15} color={colors.muted} style={{ flex: 1, textDecorationLine: 'line-through' }}>
                  {i.name}
                </T>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  buy: { backgroundColor: colors.tint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  input: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.espresso },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
});
