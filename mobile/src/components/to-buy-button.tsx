import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { showAlert } from '@/components/firdam-alert';
import { T } from '@/components/ui';
import { addShoppingItems } from '@/lib/kitchen';
import { refreshShopping, useKitchen } from '@/lib/kitchen-store';
import type { Line } from '@/shared/pantry-engine';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

/**
 * The "to buy" / "not enough" label on an ingredient, as a button: tapping it
 * puts just this ingredient on the shopping list. Once it's on the list it
 * shows "On list ✓".
 */
export function ToBuyButton({ line, label, color }: { line: Line; label: string; color: string }) {
  const k = useKitchen();
  const [busy, setBusy] = useState(false);
  const name = line.need.name.trim().toLowerCase();
  const onList = k.items.some((i) => !i.checked && i.name.trim().toLowerCase() === name);

  const add = async () => {
    if (busy || onList || !k.listId) return;
    setBusy(true);
    try {
      await addShoppingItems(k.listId, [line.shortfall ?? { name: line.need.name, quantity: line.scaled, unit: line.need.unit }], k.items);
      await refreshShopping();
    } catch (e) {
      showAlert(tr('Could not add it to Shopping'), e instanceof Error ? e.message : tr('Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={onList ? tr('{0} is on your shopping list', [line.need.name]) : tr('Add {0} to Shopping', [line.need.name])}
      accessibilityState={{ disabled: onList }}
      onPress={add}
      hitSlop={6}
      style={[styles.btn, onList ? styles.done : { borderColor: color + '55', backgroundColor: color + '14' }]}
    >
      <T size={11.5} weight="bold" color={onList ? colors.walnut : color}>
        {busy ? '…' : onList ? tr('On list ✓') : `+ ${label}`}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  done: { borderColor: colors.line, backgroundColor: colors.tint },
});
