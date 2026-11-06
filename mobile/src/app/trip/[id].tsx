import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/art';
import { showAlert } from '@/components/firdam-alert';
import { Checkbox } from '@/components/kitchen-ui';
import { QiblaCompass } from '@/components/qibla';
import { TripSheet } from '@/components/trip-sheet';
import { Button, Card, T } from '@/components/ui';
import type { ChecklistItem, Trip } from '@/lib/db-types';
import { locale, tr } from '@/lib/i18n';
import { qiblaDirection, usePrayerSettings } from '@/lib/prayer';
import { deleteTrip, destinationPrayerDay, loadTrip, saveChecklist, type DestinationDay } from '@/lib/travel';
import { TRIP_KIND_LABELS, daysUntil } from '@/shared/travel-data';
import { colors } from '@/theme';

const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

/** "13:05" (or "13:05 (+03)") → "1:05 PM". */
function time12(t: string | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? '');
  if (!m) return '—';
  const d = new Date(2000, 0, 1, Number(m[1]), Number(m[2]));
  return d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
}

/** One trip: countdown, packing checklist, prayer times and Qibla at the destination. */
export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = usePrayerSettings();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [prayer, setPrayer] = useState<DestinationDay | null>(null);
  const [prayerFailed, setPrayerFailed] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    loadTrip(id)
      .then(setTrip)
      .catch(() => setTrip(null));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!trip || !settings) return;
    const day = trip.start_date && new Date(`${trip.start_date}T00:00:00`) > new Date() ? new Date(`${trip.start_date}T12:00:00`) : new Date();
    setPrayerFailed(false);
    destinationPrayerDay(trip, settings, day)
      .then(setPrayer)
      .catch(() => setPrayerFailed(true));
  }, [trip?.id, trip?.latitude, trip?.longitude, trip?.start_date, settings?.method, settings?.hanafiAsr]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of trip?.checklist ?? []) {
      const g = item.group ?? 'My items';
      map.set(g, [...(map.get(g) ?? []), item]);
    }
    return Array.from(map.entries());
  }, [trip]);

  if (trip === undefined) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.walnut} />
      </SafeAreaView>
    );
  }
  if (trip === null) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }]}>
        <T>{tr('Trip not found.')}</T>
        <Button label={tr('Back to Travel')} variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const updateList = async (checklist: ChecklistItem[]) => {
    const before = trip;
    setTrip({ ...trip, checklist });
    try {
      await saveChecklist(trip.id, checklist);
    } catch {
      setTrip(before);
      showAlert(tr('Could not save checklist'), tr('Please try again.'));
    }
  };

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    updateList([...trip.checklist, { id: `mine-${Date.now().toString(36)}`, text, done: false, group: 'My items' }]);
    setNewItem('');
  };

  const remove = () =>
    showAlert(tr('Delete "{0}"?', [tr(trip.name)]), tr('This can’t be undone.'), [
      { text: tr('Cancel'), style: 'cancel' },
      {
        text: tr('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTrip(trip.id);
            router.back();
          } catch {
            showAlert(tr('Could not delete trip'), tr('Please try again.'));
          }
        },
      },
    ]);

  const done = trip.checklist.filter((c) => c.done).length;
  const total = trip.checklist.length;
  const daysTo = daysUntil(trip.start_date);
  const nights =
    trip.start_date && trip.end_date ? Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000) : null;
  const bearing = qiblaDirection({ latitude: trip.latitude, longitude: trip.longitude, label: trip.destination_label });
  const pilgrimage = trip.kind === 'umrah' || trip.kind === 'hajj';
  const fmt = (d: string, year = false) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(locale(), { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => router.back()} style={styles.round} hitSlop={6}>
            <Icon name="back" size={20} color={colors.espresso} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <T size={14} weight="bold" color={colors.walnut} onPress={() => setEditing(true)} accessibilityRole="link">
              {tr('Edit')}
            </T>
            <T size={14} weight="bold" color={colors.brickText} onPress={remove} accessibilityRole="link">
              {tr('Delete')}
            </T>
          </View>
        </View>

        <View style={styles.hero}>
          <T size={12} weight="bold" color={colors.gold} style={{ letterSpacing: 0.8 }}>
            {tr(TRIP_KIND_LABELS[trip.kind]).toUpperCase()}
          </T>
          <T weight="extrabold" size={26} color={colors.white} accessibilityRole="header">
            {tr(trip.name)}
          </T>
          <T size={13.5} color={colors.goldText}>
            📍 {tr(trip.destination_label)}
          </T>
          {trip.start_date ? (
            <T size={13.5} color={colors.goldText}>
              📅 {fmt(trip.start_date)}
              {trip.end_date ? ` – ${fmt(trip.end_date, true)}` : ''}
              {nights !== null ? tr(' · {0} night{1}', [nights, nights === 1 ? '' : 's']) : ''}
            </T>
          ) : null}
          <T size={13.5} color={colors.goldText}>
            👥 {trip.travellers === 1 ? tr('1 traveller') : tr('{0} travellers', [trip.travellers])}
          </T>
          {daysTo !== null && daysTo >= 0 ? (
            <View style={styles.countdown}>
              <T weight="extrabold" size={17} color={colors.white}>
                {daysTo === 0 ? tr('You travel today — safe journey!') : tr('{0} day{1} to go', [daysTo, daysTo === 1 ? '' : 's'])}
              </T>
            </View>
          ) : null}
        </View>

        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T weight="bold" size={17}>
              {tr('Packing checklist')}
            </T>
            <T size={12.5} color={colors.muted}>
              {tr('{0}/{1} packed', [done, total])}
            </T>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${total ? Math.round((done / total) * 100) : 0}%` }]} />
          </View>
          {groups.map(([group, items]) => (
            <View key={group} style={{ gap: 2, marginTop: 6 }}>
              <T size={11.5} weight="bold" color={colors.muted} style={{ letterSpacing: 0.6 }}>
                {tr(group).toUpperCase()}
              </T>
              {items.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.done }}
                    accessibilityLabel={tr(item.text)}
                    onPress={() => updateList(trip.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
                    hitSlop={4}
                  >
                    <Checkbox checked={item.done} />
                    <T size={14} color={item.done ? colors.muted : colors.espresso} style={[{ flex: 1 }, item.done && { textDecorationLine: 'line-through' }]}>
                      {tr(item.text)}
                    </T>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tr('Remove {0}', [tr(item.text)])}
                    onPress={() => updateList(trip.checklist.filter((c) => c.id !== item.id))}
                    hitSlop={8}
                  >
                    <T size={16} color={colors.muted}>
                      ×
                    </T>
                  </Pressable>
                </View>
              ))}
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <TextInput
              value={newItem}
              onChangeText={setNewItem}
              placeholder={tr('Add an item')}
              placeholderTextColor="#9C8D84"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={addItem}
              accessibilityLabel={tr('Add an item')}
            />
            <Button label="+" variant="secondary" onPress={addItem} style={{ minWidth: 52 }} />
          </View>
        </Card>

        {trip.notes ? (
          <Card style={{ gap: 6 }}>
            <T weight="bold" size={17}>
              {tr('Notes')}
            </T>
            <T size={14} color={colors.muted} style={{ lineHeight: 20 }}>
              {trip.notes}
            </T>
          </Card>
        ) : null}

        <Card style={{ gap: 6 }}>
          <T weight="bold" size={17}>
            {tr('Prayer times at your destination')}
          </T>
          {prayer ? (
            <>
              <T size={12.5} color={colors.muted}>
                {tr('For')} {prayer.gregorian.date} {tr('· local time there')}
              </T>
              {PRAYER_KEYS.map((k, i) => (
                <View key={k} style={[styles.row, i < PRAYER_KEYS.length - 1 && styles.line]}>
                  <T size={14.5}>{tr(k)}</T>
                  <T size={14.5} color={colors.muted}>
                    {time12(prayer.timings[k])}
                  </T>
                </View>
              ))}
            </>
          ) : prayerFailed ? (
            <T size={13.5} color={colors.muted}>
              {tr('Prayer times are unavailable right now. Check your connection.')}
            </T>
          ) : (
            <ActivityIndicator color={colors.walnut} />
          )}
        </Card>

        <Card style={{ alignItems: 'center', gap: 8 }}>
          <T weight="bold" size={17} style={{ alignSelf: 'flex-start' }}>
            {tr('Qibla at your destination')}
          </T>
          <QiblaCompass bearing={bearing} size={120} />
          <T size={13.5} color={colors.muted}>
            {tr('{0}° from north', [Math.round(bearing)])}
          </T>
        </Card>

        <Pressable accessibilityRole="button" onPress={() => router.push('/halal')}>
          {({ pressed }) => (
            <Card style={[{ gap: 2 }, pressed && { opacity: 0.85 }]}>
              <T weight="bold" size={15}>
                {tr('Halal food & mosques there')}
              </T>
              <T size={13} color={colors.muted}>
                {tr('Open Halal Places and search')} {tr(trip.destination_label)}
              </T>
            </Card>
          )}
        </Pressable>

        {pilgrimage ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/travel', params: { tab: 'agencies' } })}>
            {({ pressed }) => (
              <Card style={[{ gap: 2, backgroundColor: colors.amberTint, borderColor: colors.gold }, pressed && { opacity: 0.85 }]}>
                <T weight="bold" size={15}>
                  {tr('Find a trusted {0} operator', [tr(TRIP_KIND_LABELS[trip.kind])])}
                </T>
                <T size={13} color={colors.muted}>
                  {tr('Compare Firdam-listed operators and send enquiries in one place.')}
                </T>
              </Card>
            )}
          </Pressable>
        ) : null}

        <Pressable accessibilityRole="button" onPress={() => router.push('/finance')}>
          {({ pressed }) => (
            <Card style={[{ gap: 2 }, pressed && { opacity: 0.85 }]}>
              <T weight="bold" size={15}>
                {tr('Save for this trip')}
              </T>
              <T size={13} color={colors.muted}>
                {trip.budget ? tr('Budget {0}', [trip.budget.toLocaleString(locale())]) : tr('Create a savings goal in Finance')}
              </T>
            </Card>
          )}
        </Pressable>
      </ScrollView>
      {editing ? (
        <TripSheet
          trip={trip}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 14 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: colors.espresso, borderRadius: 22, padding: 20, gap: 5 },
  countdown: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(255,253,249,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.tint, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.sage },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, backgroundColor: colors.card, fontSize: 15, color: colors.espresso },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
});
