import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { StarPattern } from '@/components/art';
import { QiblaCompass } from '@/components/qibla';
import { Button, Card, T } from '@/components/ui';
import { askForAlerts } from '@/lib/adhan-alerts';
import { placeFromDevice } from '@/lib/location';
import {
  PRAYERS,
  formatCountdown,
  formatTime,
  methodById,
  nextPrayer,
  qiblaDirection,
  timesFor,
  useNow,
  usePrayerSettings,
  type PrayerId,
} from '@/lib/prayer';
import { colors, fonts } from '@/theme';

function Bell({ on }: { on: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" stroke={on ? colors.walnut : '#A99A90'} strokeWidth={1.8} strokeLinejoin="round" fill={on ? colors.tint : 'none'} />
      <Path d="M10 21h4" stroke={on ? colors.walnut : '#A99A90'} strokeWidth={1.8} strokeLinecap="round" />
      {!on && <Path d="M4 4l16 16" stroke="#A99A90" strokeWidth={1.8} strokeLinecap="round" />}
    </Svg>
  );
}

function SetLocation() {
  const { update } = usePrayerSettings();
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const useMine = async () => {
    setBusy(true);
    try {
      const place = await placeFromDevice();
      if (place === 'denied') setDenied(true);
      else {
        await update({ place });
        await askForAlerts();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ gap: 12 }}>
      <T weight="extrabold" size={18}>
        Where do you pray?
      </T>
      <T size={14} color={colors.muted} style={{ lineHeight: 20 }}>
        Firdam works out prayer times on your phone from your location, so they keep working offline. Your location stays on your phone.
      </T>
      {denied && (
        <T size={13.5} weight="semibold" color={colors.brickText}>
          Location is off for Firdam. Choose your city instead, or allow location in your iPhone Settings.
        </T>
      )}
      <Button label="Use my location" onPress={useMine} busy={busy} />
      <Button label="Choose a city" variant="secondary" onPress={() => router.push('/prayer-settings')} />
    </Card>
  );
}

export default function Prayer() {
  const { settings, update } = usePrayerSettings();
  const now = useNow();

  if (!settings) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.walnut} />
      </SafeAreaView>
    );
  }

  const place = settings.place;
  const toggle = async (id: PrayerId) => {
    const turningOn = !settings.alerts[id];
    if (turningOn && !(await askForAlerts())) return;
    await update({ alerts: { ...settings.alerts, [id]: turningOn } });
  };

  if (!place) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
            Prayer
          </T>
          <SetLocation />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const today = timesFor(settings, place, now);
  const next = nextPrayer(settings, place, now);
  const nextInfo = PRAYERS.find((p) => p.id === next.id)!;
  const method = methodById(settings.method);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <SafeAreaView edges={['top']} style={styles.hero}>
          <View style={styles.heroStar} pointerEvents="none">
            <StarPattern size={300} color={colors.gold} />
          </View>
          <View style={styles.heroTop}>
            <T size={14} weight="semibold" color={colors.goldText}>
              {`${place.label} · ${method.name}`}
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel="Prayer settings" onPress={() => router.push('/prayer-settings')} style={styles.gear}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke={colors.goldText} strokeWidth={1.8} strokeLinecap="round" />
                <Path d="M16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke={colors.goldText} strokeWidth={1.8} />
              </Svg>
            </Pressable>
          </View>
          <T style={{ fontFamily: fonts.arabic, marginTop: 8 }} size={22} color={colors.gold}>
            {nextInfo.arabic}
          </T>
          <T weight="extrabold" size={44} color={colors.linen} style={{ letterSpacing: -1 }}>
            {`${nextInfo.name} ${formatTime(next.at)}`}
          </T>
          <T size={15} color="#E9DCCD">
            {formatCountdown(next.at.getTime() - now.getTime())}
          </T>
        </SafeAreaView>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 14 }}>
          <Card style={{ paddingVertical: 4 }}>
            {PRAYERS.map((p, i) => {
              const isNext = p.id === next.id && next.at.toDateString() === now.toDateString();
              const on = !!settings.alerts[p.id];
              return (
                <View key={p.id} style={[styles.row, i < PRAYERS.length - 1 && styles.rowLine]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <T size={15.5} weight={isNext ? 'extrabold' : 'semibold'} color={p.alert ? colors.espresso : colors.muted}>
                      {p.name}
                    </T>
                    {isNext && (
                      <View style={styles.nextPill}>
                        <T size={11} weight="bold" color={colors.white}>
                          NEXT
                        </T>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T size={15.5} weight="semibold" color={p.alert ? colors.espresso : colors.muted}>
                      {formatTime(today.times[p.id])}
                    </T>
                    {p.alert ? (
                      <Pressable
                        accessibilityRole="switch"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`Adhan alert for ${p.name}`}
                        onPress={() => toggle(p.id)}
                        style={[styles.bell, { backgroundColor: on ? colors.tint : '#F3EEE8' }]}
                      >
                        <Bell on={on} />
                      </Pressable>
                    ) : (
                      <View style={{ width: 44 }} />
                    )}
                  </View>
                </View>
              );
            })}
          </Card>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, alignItems: 'center' }}>
              <QiblaCompass bearing={qiblaDirection(place)} size={92} />
            </Card>
            <View style={[styles.ramadan]}>
              <T size={14} weight="bold" color="#1F3F2C">
                Ramadan mode
              </T>
              <T size={12.5} color={colors.sageDark} style={{ marginTop: 4, lineHeight: 18 }}>
                Suhoor and iftar meals timed to Fajr and Maghrib. Coming before Ramadan.
              </T>
            </View>
          </View>

          <T size={12.5} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
            Times are calculated with the {method.name} method. If your mosque&apos;s timetable differs, follow your mosque.
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  center: { flex: 1, backgroundColor: colors.linen, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: colors.espresso, paddingHorizontal: 20, paddingBottom: 26, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  heroStar: { position: 'absolute', right: -90, top: -40, opacity: 0.3 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  gear: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4A372F', alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  nextPill: { backgroundColor: colors.walnut, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  bell: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ramadan: { flex: 1, backgroundColor: colors.sageTint, borderRadius: 24, padding: 16, justifyContent: 'flex-end' },
});
