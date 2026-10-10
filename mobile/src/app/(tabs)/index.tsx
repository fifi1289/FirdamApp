import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StarPattern } from '@/components/art';
import { ComingNext, TabScreen } from '@/components/screen';
import { T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { PRAYERS, formatCountdown, formatTime, nextPrayer, timesFor, useNow, usePrayerSettings } from '@/lib/prayer';
import { colors } from '@/theme';

function todayLabel(now: Date) {
  return now.toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'short' });
}

function PrayerCard() {
  const { settings } = usePrayerSettings();
  const now = useNow();
  const place = settings?.place ?? null;

  const next = settings && place ? nextPrayer(settings, place, now) : null;
  const today = settings && place ? timesFor(settings, place, now) : null;
  const nextInfo = next ? PRAYERS.find((p) => p.id === next.id) : null;
  const sameDay = next ? next.at.toDateString() === now.toDateString() : false;

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/prayer')} style={styles.prayer}>
      <View style={styles.star} pointerEvents="none">
        <StarPattern size={190} color={colors.gold} strokeWidth={0.8} />
      </View>
      <T size={13} weight="semibold" color={colors.goldText} style={{ letterSpacing: 0.4 }}>
        {place ? `NEXT PRAYER · ${place.label.toUpperCase()}` : 'PRAYER TIMES'}
      </T>
      {next && nextInfo && today ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <T size={34} weight="extrabold" color={colors.linen}>
              {nextInfo.name}
            </T>
            <T size={30} weight="regular" color={colors.goldText}>
              {formatTime(next.at)}
            </T>
          </View>
          <T size={14} color="#E9DCCD">
            {formatCountdown(next.at.getTime() - now.getTime())}
            {settings?.alerts[next.id] ? ' · adhan alert on' : ''}
          </T>
          <View style={styles.row}>
            {PRAYERS.filter((p) => p.alert).map((p) => {
              const active = sameDay && p.id === next.id;
              return (
                <View key={p.id} style={[styles.cell, active && styles.cellActive]}>
                  <T size={12} weight={active ? 'bold' : 'regular'} color={active ? colors.espresso : '#CDB9A5'}>
                    {p.name}
                  </T>
                  <T size={12} weight={active ? 'bold' : 'semibold'} color={active ? colors.espresso : '#E9DCCD'}>
                    {formatTime(today.times[p.id]).replace(/ ?[ap]m$/, '')}
                  </T>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <T size={24} weight="extrabold" color={colors.linen} style={{ marginTop: 6 }}>
            Set your location
          </T>
          <T size={14} color="#E9DCCD" style={{ marginTop: 4 }}>
            Tap here to see today’s prayer times and turn on adhan alerts.
          </T>
        </>
      )}
    </Pressable>
  );
}

export default function Today() {
  const { firstName } = useAuth();
  const now = useNow(60000);
  return (
    <TabScreen title={todayLabel(now)} subtitle={`Assalamu alaikum${firstName ? `, ${firstName}` : ''}`}>
      <PrayerCard />
      <ComingNext step={4} title="Tonight’s dinner" text="Your meal plan, sized for your family, with what is already in your pantry." />
      <ComingNext step={5} title="Use soon" text="Pantry items close to their date, so nothing goes to waste." />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  prayer: { backgroundColor: colors.espresso, borderRadius: 24, padding: 20, overflow: 'hidden' },
  star: { position: 'absolute', right: -50, top: -40, opacity: 0.35 },
  row: { flexDirection: 'row', gap: 6, marginTop: 18 },
  cell: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 4, gap: 2 },
  cellActive: { backgroundColor: colors.gold },
});
