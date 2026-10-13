import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import type { PantryItem } from '@/lib/db-types';
import { callFunction } from '@/lib/functions';
import { patchKitchen, refreshKitchen, useKitchen } from '@/lib/kitchen-store';
import { supabase } from '@/lib/supabase';
import { groupByAisle, guessCategory, parseQuickAdd, toPantryUnit } from '@/shared/grocery-utils';
import { haramItemMessage } from '@/shared/halal';
import { isNonFood, suggestedExpiry } from '@/shared/kitchen-items';
import { formatAmount } from '@/shared/pantry-units';
import { colors, fonts } from '@/theme';
import { showAlert } from '@/components/firdam-alert';

const DAY = 24 * 60 * 60 * 1000;

function daysLeft(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00`).getTime();
  return Math.round((d - Date.now()) / DAY);
}

// One colour per aisle, so the pantry is easy to scan.
const AISLE_COLORS: Record<string, string> = {
  Vegetables: '#5E8C4A', Fruits: '#D9822B', Meat: '#B5473A', Poultry: '#C8743C', Seafood: '#3C7DA6',
  Dairy: '#7FA7C9', Eggs: '#D8B44A', Bakery: '#B7895B', Grains: '#A68A4E', 'Pasta & Rice': '#C9A86A',
  'Canned Foods': '#8C6D8F', 'Frozen Foods': '#5BA3B5', Spices: '#C0562F', 'Oils & Condiments': '#9A8A3A',
  Snacks: '#C76B8A', Beverages: '#4F8D8A',
};
const aisleColor = (c: string) => AISLE_COLORS[c] ?? '#9C8D84';

/** Expiry label and colour: red when past, amber when close, green when fine. */
function expiryBadge(date: string | null): { label: string; tone: 'brick' | 'amber' | 'sage' } | null {
  const d = daysLeft(date);
  if (d == null) return null;
  if (d < 0) return { label: 'Expired', tone: 'brick' };
  if (d === 0) return { label: 'Use today', tone: 'brick' };
  if (d <= 3) return { label: d === 1 ? 'Use tomorrow' : `Use in ${d} days`, tone: 'amber' };
  return { label: `Until ${new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`, tone: 'sage' };
}

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        expiration_date: suggestedExpiry(guessCategory(p.name)),
      }));
    setBusy(true);
    try {
      if (rows.length) {
        const { error } = await supabase.from('pantry_items').insert(rows);
        if (error) throw error;
      }
      if (refused.length) showAlert('Not added', refused.join('\n\n'));
      setText('');
      await refreshKitchen();
    } catch (e) {
      showAlert('Could not add', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Receipt → food lines → pantry. The server checks the monthly allowance
  // (1 on the free plan) and leaves out anything that isn't halal.
  const [scanning, setScanning] = useState(false);
  const scanWith = async (source: 'camera' | 'library') => {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return showAlert('Permission needed', 'Allow access in Settings to scan a receipt.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
    const shot = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = shot.canceled ? null : shot.assets[0];
    if (!asset?.base64) return;
    setScanning(true);
    try {
      const res = await callFunction<{
        items: { name: string; quantity: number; unit: string; category: string; staple: boolean }[];
        skipped?: { name: string }[];
      }>('receipt-scan', undefined, { image: `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` });
      const items = (res.items ?? []).filter((i) => !isNonFood(i.name));
      if (!items.length) return showAlert('No food found', 'Try again with the whole receipt flat and in good light.');
      const list = items.map((i) => `• ${i.quantity} ${i.unit} ${i.name}`).join('\n');
      const skipped = res.skipped?.length ? `\n\nLeft out (not halal): ${res.skipped.map((x) => x.name).join(', ')}` : '';
      showAlert(`Add ${items.length} item${items.length === 1 ? '' : 's'} to your pantry?`, list + skipped, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            const { error } = await supabase.from('pantry_items').insert(
              items.map((i) => ({
                name: i.name,
                category: i.category,
                quantity: i.quantity,
                unit: i.unit,
                tracking: i.staple ? 'level' : 'count',
                ...(i.staple ? { level: 'full' } : {}),
                expiration_date: i.staple ? null : suggestedExpiry(i.category),
              })),
            );
            if (error) showAlert('Could not add', error.message);
            await refreshKitchen();
          },
        },
      ]);
    } catch (e) {
      showAlert('Could not read the receipt', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setScanning(false);
    }
  };
  const scanReceipt = () =>
    showAlert('Scan a receipt', 'Food on the receipt goes into your pantry. The free plan includes one scan a month.', [
      { text: 'Take a photo', onPress: () => scanWith('camera') },
      { text: 'Choose a photo', onPress: () => scanWith('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const [editing, setEditing] = useState<PantryItem | null>(null);
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
      <Button label={scanning ? 'Reading your receipt…' : 'Scan a receipt'} variant="secondary" onPress={scanReceipt} busy={scanning} />

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: aisleColor(g.category) }]} />
              <T size={12.5} weight="bold" color={aisleColor(g.category)} style={{ letterSpacing: 0.4 }}>
                {`${g.category.toUpperCase()} · ${g.items.length}`}
              </T>
            </View>
            <Card style={{ paddingVertical: 2 }}>
              {g.items.map((i, idx) => (
                <Pressable
                  key={i.id}
                  accessibilityRole="button"
                  accessibilityHint="Edit amount or expiry date"
                  onPress={() => setEditing(i)}
                  style={[styles.row, idx < g.items.length - 1 && styles.line]}
                >
                  <View style={[styles.dot, { backgroundColor: aisleColor(g.category) }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size={15} weight="semibold">
                      {i.name}
                    </T>
                    <T size={12.5} color={colors.muted}>
                      {amount(i)}
                    </T>
                  </View>
                  {expiryBadge(i.expiration_date) ? <Badge {...expiryBadge(i.expiration_date)!} /> : null}
                  <View style={styles.edit}>
                    <T size={12.5} weight="bold" color={colors.walnut}>
                      Edit
                    </T>
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        ))
      )}
      <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>
        Tap Edit to change an item’s amount or use-by date, or to mark it used up.
      </T>
      <PantryItemSheet item={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.espresso },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
  soonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  edit: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  backdrop: { flex: 1, backgroundColor: 'rgba(40,28,20,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.linen, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14, paddingBottom: 34 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const EXPIRY_CHOICES: { label: string; days: number | null }[] = [
  { label: 'Today', days: 0 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: 'No date', days: null },
];

/** Edit one pantry item: amount, expiry date, or used up. Nothing is removed by a stray tap. */
function PantryItemSheet({ item, onClose }: { item: PantryItem | null; onClose: () => void }) {
  const k = useKitchen();
  const [qty, setQty] = useState('');
  const [expiry, setExpiry] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (item && item.id !== lastId) {
    setLastId(item.id);
    setQty(item.quantity != null ? String(item.quantity) : '');
    setExpiry(item.expiration_date ?? null);
  }
  if (!item) return null;

  const save = async () => {
    const n = Number(qty.replace(',', '.'));
    if (item.tracking !== 'level' && (!Number.isFinite(n) || n < 0)) return setProblem('Enter an amount as a number, for example 2 or 0.5.');
    if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return setProblem('Type the date as YYYY-MM-DD, for example 2026-10-20.');
    setSaving(true);
    const patch = { expiration_date: expiry || null, ...(item.tracking === 'level' ? {} : { quantity: n }), updated_at: new Date().toISOString() };
    const { error } = n === 0 && item.tracking !== 'level'
      ? await supabase.from('pantry_items').delete().eq('id', item.id)
      : await supabase.from('pantry_items').update(patch).eq('id', item.id);
    setSaving(false);
    if (error) return setProblem(`Could not save: ${error.message}`);
    onClose();
    await refreshKitchen();
  };

  const usedUp = async () => {
    Haptics.selectionAsync().catch(() => {});
    patchKitchen({ pantry: k.pantry.filter((p) => p.id !== item.id) });
    onClose();
    const { error } = await supabase.from('pantry_items').delete().eq('id', item.id);
    if (error) await refreshKitchen();
  };

  const setLevel = async (level: 'full' | 'low' | 'out') => {
    await supabase.from('pantry_items').update({ level, updated_at: new Date().toISOString() }).eq('id', item.id);
    await refreshKitchen();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
            <T weight="extrabold" size={20}>
              {item.name}
            </T>
            {item.tracking === 'level' ? (
              <View style={styles.wrap}>
                {(['full', 'low', 'out'] as const).map((l) => (
                  <Pressable key={l} onPress={() => setLevel(l)} accessibilityRole="button">
                    <Badge label={l === 'full' ? 'Plenty' : l === 'low' ? 'Running low' : 'Out'} tone={item.level === l ? (l === 'out' ? 'brick' : l === 'low' ? 'amber' : 'sage') : 'walnut'} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                <T weight="semibold" size={14}>{`Amount (${item.unit === 'Pieces' ? 'pieces' : item.unit})`}</T>
                <TextInput value={qty} onChangeText={setQty} keyboardType="decimal-pad" style={styles.input} accessibilityLabel="Amount" />
              </View>
            )}
            <View style={{ gap: 6 }}>
              <T weight="semibold" size={14}>
                Use by
              </T>
              <View style={styles.wrap}>
                {EXPIRY_CHOICES.map((c) => {
                  const value = c.days == null ? null : inDays(c.days);
                  return (
                    <Pressable key={c.label} onPress={() => setExpiry(value)} accessibilityRole="button">
                      <Badge label={c.label} tone={expiry === value ? 'sage' : 'walnut'} />
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={expiry ?? ''}
                onChangeText={(t) => setExpiry(t || null)}
                placeholder="or type a date: 2026-10-20"
                placeholderTextColor="#9C8D84"
                style={styles.input}
                accessibilityLabel="Expiry date"
              />
            </View>
            {problem ? (
              <T size={13.5} color={colors.brickText}>
                {problem}
              </T>
            ) : null}
            <Button label="Save" onPress={save} busy={saving} />
            <Button label="Used it all — remove" variant="secondary" onPress={usedUp} />
            <Button label="Cancel" variant="text" onPress={onClose} />
          </ScrollView>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
