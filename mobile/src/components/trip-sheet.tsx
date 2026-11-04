import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { showAlert } from '@/components/firdam-alert';
import { Chip } from '@/components/kitchen-ui';
import { Button, Field, T } from '@/components/ui';
import type { Trip, TripKind } from '@/lib/db-types';
import { tr } from '@/lib/i18n';
import { placeFromSearch } from '@/lib/location';
import { saveTrip } from '@/lib/travel';
import { TRIP_KIND_LABELS, TRIP_KIND_ORDER } from '@/shared/travel-data';
import { colors } from '@/theme';

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime());

export function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={tr('Close')}>
          <Pressable style={styles.sheetWrap} onPress={() => {}}>
            <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled" bounces={false}>
              <T weight="extrabold" size={20}>
                {title}
              </T>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Plan a trip, or edit one: the same fields as on firdam.com. */
export function TripSheet({ trip, onClose, onSaved }: { trip?: Trip | null; onClose: () => void; onSaved: (id: string) => void }) {
  const [kind, setKind] = useState<TripKind>(trip?.kind ?? 'holiday');
  const [destText, setDestText] = useState(trip?.destination_label ?? '');
  const [dest, setDest] = useState<{ label: string; latitude: number; longitude: number } | null>(
    trip ? { label: trip.destination_label, latitude: trip.latitude, longitude: trip.longitude } : null
  );
  const [finding, setFinding] = useState(false);
  const [name, setName] = useState(trip?.name ?? '');
  const [start, setStart] = useState(trip?.start_date ?? '');
  const [end, setEnd] = useState(trip?.end_date ?? '');
  const [travellers, setTravellers] = useState(String(trip?.travellers ?? 2));
  const [budget, setBudget] = useState(trip?.budget != null ? String(trip.budget) : '');
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const find = async () => {
    const text = destText.trim() || (kind === 'umrah' || kind === 'hajj' ? 'Makkah' : '');
    if (!text) return;
    setFinding(true);
    try {
      const place = await placeFromSearch(text);
      if (!place) {
        showAlert(tr('Place not found'), tr('Try a city name, e.g. Istanbul or Makkah.'));
        return;
      }
      // Keep what the person typed when it's more precise than the city name.
      setDest({ label: text.length > place.label.length ? text : place.label, latitude: place.latitude, longitude: place.longitude });
      setDestText(text.length > place.label.length ? text : place.label);
    } catch {
      showAlert(tr('Place not found'), tr('Check your connection and try again.'));
    } finally {
      setFinding(false);
    }
  };

  const save = async () => {
    if (!dest) return showAlert(tr('Choose your destination.'), tr('Type a city, then tap Find.'));
    if ((start && !isDate(start)) || (end && !isDate(end))) return showAlert(tr('Check the dates'), tr('Use the format YYYY-MM-DD, e.g. 2027-03-15.'));
    if (start && end && end < start) return showAlert(tr('The return date is before the departure date.'));
    setSaving(true);
    try {
      const id = await saveTrip(
        { name, kind, destination: dest, start, end, travellers: Number(travellers), budget, notes },
        trip
      );
      onSaved(id);
    } catch (e) {
      showAlert(tr('Could not save trip'), e instanceof Error ? e.message : tr('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title={trip ? tr('Edit trip') : tr('Plan a trip')}>
      <T size={13.5} color={colors.muted} style={{ lineHeight: 19 }}>
        {tr('We’ll prepare prayer times, the Qibla, halal food and a packing list for your destination.')}
      </T>
      <T size={13} weight="bold" color={colors.muted}>
        {tr('Type of trip')}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TRIP_KIND_ORDER.map((k) => (
          <Chip key={k} label={tr(TRIP_KIND_LABELS[k])} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label={tr('Destination')}
            value={destText}
            onChangeText={(v) => {
              setDestText(v);
              setDest(null);
            }}
            placeholder={kind === 'umrah' || kind === 'hajj' ? tr('Makkah') : tr('Search a city — e.g. Istanbul')}
            returnKeyType="search"
            onSubmitEditing={find}
          />
        </View>
        <Button label={dest ? tr('Found ✓') : tr('Find')} variant="secondary" onPress={find} busy={finding} style={{ minWidth: 92 }} />
      </View>
      <Field label={tr('Trip name (optional)')} value={name} onChangeText={setName} placeholder={tr('e.g. Family Umrah 2027')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label={tr('Departure')} value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={tr('Return')} value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label={tr('Travellers')} value={travellers} onChangeText={setTravellers} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={tr('Budget (optional)')} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" />
        </View>
      </View>
      <Field label={tr('Notes')} value={notes} onChangeText={setNotes} placeholder={tr('Hotel, flight numbers, people to visit…')} multiline />
      <Button label={trip ? tr('Save') : tr('Create trip')} onPress={save} busy={saving} />
      <Button label={tr('Cancel')} variant="text" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(59,42,36,0.35)', justifyContent: 'flex-end' },
  sheetWrap: { backgroundColor: colors.linen, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheet: { padding: 20, gap: 12, paddingBottom: 34 },
});
