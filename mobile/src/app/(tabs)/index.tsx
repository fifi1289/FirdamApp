import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StarPattern } from '@/components/art';
import { openMeal } from '@/components/kitchen-plan';
import { Photo } from '@/components/kitchen-ui';
import { TabScreen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatDateISO } from '@/lib/kitchen';
import { useKitchen } from '@/lib/kitchen-store';
import { formatPortions } from '@/shared/pantry-portions';
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

function TonightCard() {
  const k = useKitchen();
  const today = formatDateISO(new Date());
  const meals = k.week?.plan.days.find((d) => d.date === today)?.meals ?? [];
  const meal = meals.find((m) => m.type === 'dinner') ?? meals[meals.length - 1];
  const openItems = k.items.filter((i) => !i.checked).length;

  if (k.loading) return null;
  return (
    <>
      {meal ? (
        <Card style={styles.dinner}>
          <Photo uri={meal.image} size={92} radius={18} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={12} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              {meal.type === 'dinner' ? 'TONIGHT’S DINNER' : `TODAY · ${meal.type.toUpperCase()}`}
            </T>
            <T size={18} weight="bold" numberOfLines={2} style={{ marginTop: 3 }}>
              {meal.name}
            </T>
            <T size={13} color={colors.muted}>{`${meal.prepTime + meal.cookTime} min · for ${formatPortions(meal.servings)}`}</T>
            <Button label="Start cooking" onPress={() => openMeal(meal, today)} style={{ height: 36, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 14 }} />
          </View>
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <T size={12} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
            THIS WEEK’S MEALS
          </T>
          <T size={15} color="#5F5048">
            No plan yet. Firdam can plan your week in seconds, sized for your family.
          </T>
          <Button label="Plan my week" onPress={() => router.push('/kitchen')} style={{ height: 44 }} />
        </Card>
      )}
      {openItems ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/kitchen')} style={styles.shopping}>
          <T weight="bold">Family shopping list</T>
          <T size={13} color={colors.muted}>{`${openItems} item${openItems === 1 ? '' : 's'} to buy`}</T>
        </Pressable>
      ) : null}
    </>
  );
}

export default function Today() {
  const { firstName } = useAuth();
  const now = useNow(60000);
  return (
    <TabScreen title={todayLabel(now)} subtitle={`Assalamu alaikum${firstName ? `, ${firstName}` : ''}`}>
      <PrayerCard />
      <TonightCard />
      <Card style={{ gap: 6 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          HALAL NEAR YOU
        </T>
        <T size={15}>Restaurants, butchers, groceries and mosques around you, with directions.</T>
        <Button label="Find halal places" variant="secondary" onPress={() => router.push('/halal')} />
      </Card>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  prayer: { backgroundColor: colors.espresso, borderRadius: 24, padding: 20, overflow: 'hidden' },
  star: { position: 'absolute', right: -50, top: -40, opacity: 0.35 },
  row: { flexDirection: 'row', gap: 6, marginTop: 18 },
  cell: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 4, gap: 2 },
  cellActive: { backgroundColor: colors.gold },
  dinner: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14 },
  shopping: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
});
