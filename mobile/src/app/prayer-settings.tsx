import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormMessage } from '@/components/auth-shell';
import { Button, Card, Field, T } from '@/components/ui';
import { askForAlerts } from '@/lib/adhan-alerts';
import { placeFromDevice, placeFromSearch } from '@/lib/location';
import { METHODS, usePrayerSettings } from '@/lib/prayer';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

function Choice({ label, detail, selected, onPress }: { label: string; detail?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && { borderColor: colors.walnut, backgroundColor: colors.tint }]}
    >
      <View style={[styles.radio, selected && { borderColor: colors.walnut }]}>{selected && <View style={styles.dot} />}</View>
      <View style={{ flex: 1 }}>
        <T weight={selected ? 'bold' : 'semibold'} size={15}>
          {label}
        </T>
        {detail ? (
          <T size={12.5} color={colors.muted}>
            {detail}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function PrayerSettingsScreen() {
  const { settings, update } = usePrayerSettings();
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState<'device' | 'search' | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);

  if (!settings) return null;

  const useMine = async () => {
    setBusy('device');
    setMessage(null);
    try {
      const place = await placeFromDevice();
      if (place === 'denied') {
        setMessage({ text: tr('Location is off for Firdam. Type your city instead, or allow location in Settings.'), tone: 'error' });
        return;
      }
      await update({ place });
      await askForAlerts();
      setMessage({ text: tr('Prayer times set for {0}.', [place.label]), tone: 'success' });
    } catch {
      setMessage({ text: tr('Could not find your location. Try typing your city.'), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    setBusy('search');
    setMessage(null);
    try {
      const place = await placeFromSearch(city);
      if (!place) {
        setMessage({ text: tr('We couldn’t find that place. Try “City, Country”.'), tone: 'error' });
        return;
      }
      await update({ place });
      await askForAlerts();
      setMessage({ text: tr('Prayer times set for {0}.', [place.label]), tone: 'success' });
      setCity('');
    } catch {
      setMessage({ text: tr('We couldn’t look that up. Check your connection and try again.'), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <T weight="extrabold" size={22} accessibilityRole="header">
          {tr('Prayer settings')}
        </T>
        <Button label={tr('Done')} variant="text" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 10 }}>
          <T weight="bold" size={16}>
            {tr('Location')}
          </T>
          <T size={14} color={colors.muted}>
            {settings.place ? tr('Now: {0}', [settings.place.label]) : tr('Not set yet')}
          </T>
          <Button label={tr('Use my current location')} onPress={useMine} busy={busy === 'device'} />
          <Field label={tr('Or type a city')} value={city} onChangeText={setCity} placeholder={tr('e.g. Mississauga or London, UK')} returnKeyType="search" onSubmitEditing={search} />
          <Button label={tr('Set this city')} variant="secondary" onPress={search} busy={busy === 'search'} />
          {message && <FormMessage text={message.text} tone={message.tone} />}
        </View>

        <View style={{ gap: 10 }}>
          <T weight="bold" size={16}>
            {tr('Asr time')}
          </T>
          <Choice label={tr('Standard')} detail={tr('Shafi\'i, Maliki and Hanbali')} selected={!settings.hanafiAsr} onPress={() => update({ hanafiAsr: false })} />
          <Choice label={tr('Hanafi')} detail={tr('Later Asr time')} selected={settings.hanafiAsr} onPress={() => update({ hanafiAsr: true })} />
        </View>

        <View style={{ gap: 10 }}>
          <T weight="bold" size={16}>
            {tr('Calculation method')}
          </T>
          <T size={13.5} color={colors.muted}>
            {tr('Choose the method your local mosque follows.')}
          </T>
          {METHODS.map((m) => (
            <Choice key={m.id} label={m.name} detail={m.region} selected={settings.method === m.id} onPress={() => update({ method: m.id })} />
          ))}
        </View>

        <Card style={{ backgroundColor: colors.tint, borderColor: colors.tint }}>
          <T size={13.5} color="#5F5048" style={{ lineHeight: 20 }}>
            {tr('Your location is only used on this phone to work out prayer times and the Qibla. It is not sent to Firdam.')}
          </T>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.walnut },
});
