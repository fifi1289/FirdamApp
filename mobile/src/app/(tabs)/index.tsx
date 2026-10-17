import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StarPattern } from '@/components/art';
import { openMeal } from '@/components/kitchen-plan';
import { Badge, Photo } from '@/components/kitchen-ui';
import { TabScreen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatDateISO, mealImage, useFreshMealPhotos } from '@/lib/kitchen';
import { getCurrency, loadMonth } from '@/lib/finance';
import { formatMoney, monthTotals } from '@/shared/finance-core';
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

/** Food at home that should be eaten soon: expired, today, or within 3 days. */
function UseSoonCard() {
  const k = useKitchen();
  const today = new Date(`${formatDateISO(new Date())}T12:00:00`).getTime();
  const soon = k.pantry
    .filter((i) => i.expiration_date)
    .map((i) => ({ i, d: Math.round((new Date(`${i.expiration_date}T12:00:00`).getTime() - today) / 86_400_000) }))
    .filter((x) => x.d <= 3)
    .sort((a, b) => a.d - b.d);
  if (k.loading || soon.length === 0) return null;
  const expired = soon.filter((x) => x.d < 0).length;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/kitchen')} style={[styles.warn, expired ? styles.warnRed : null]}>
      <T size={12.5} weight="bold" color={expired ? colors.brickText : '#8A5A16'} style={{ letterSpacing: 0.4 }}>
        {expired ? `USE SOON · ${expired} EXPIRED` : 'USE SOON'}
      </T>
      {soon.slice(0, 4).map(({ i, d }) => (
        <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size={15} weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
            {i.name}
          </T>
          <Badge label={d < 0 ? 'Expired' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`} tone={d <= 0 ? 'brick' : 'amber'} />
        </View>
      ))}
      <T size={12.5} color={colors.muted}>
        {soon.length > 4 ? `+ ${soon.length - 4} more · ` : ''}Tap to see recipes that use them in Kitchen.
      </T>
    </Pressable>
  );
}

// Modules on firdam.com that are coming to the app.
const COMING = [
  { title: 'Ramadan', text: 'Suhoor and iftar times and a fasting tracker' },
  { title: 'Travel', text: 'Halal-friendly trips, Umrah and Hajj with trusted agencies' },
  { title: 'Family Calendar', text: 'Eid, Aqiqah, Nikah, birthdays and school events' },
  { title: 'Community', text: 'Halaqas, iftars, Eid prayers and fundraisers near you' },
  { title: 'Health', text: 'Sunnah habits, appointments and vaccinations' },
];

/** Finance & zakat: this month at a glance, opens the Finance screen. */
function MoneyCard() {
  const [month, setMonth] = useState<{ spent: number; giving: number; currency: string } | null>(null);
  useEffect(() => {
    const now = new Date();
    Promise.all([loadMonth(now.getFullYear(), now.getMonth() + 1), getCurrency()])
      .then(([rows, currency]) => {
        const t = monthTotals(rows, []);
        setMonth({ spent: t.expense, giving: t.giving, currency });
      })
      .catch(() => setMonth(null));
  }, []);
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Opens Finance and zakat" onPress={() => router.push('/finance')}>
      <Card style={{ gap: 8 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          FINANCE & ZAKAT
        </T>
        {month && (month.spent > 0 || month.giving > 0) ? (
          <T size={15} weight="semibold">
            {`${formatMoney(month.spent, month.currency)} spent · ${formatMoney(month.giving, month.currency)} given this month`}
          </T>
        ) : (
          <T size={15} weight="semibold">
            Budget, savings goals, sadaqah, and zakat al-mal and al-fitr
          </T>
        )}
        <T size={14} weight="bold" color={colors.walnut}>
          Open Finance ›
        </T>
      </Card>
    </Pressable>
  );
}

function ComingSoonCard() {
  return (
    <Card style={{ gap: 10 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        COMING SOON TO THE APP
      </T>
      {COMING.map((c) => (
        <View key={c.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.soonDot} />
          <View style={{ flex: 1 }}>
            <T size={14.5} weight="semibold">
              {c.title}
            </T>
            <T size={12.5} color={colors.muted}>
              {c.text}
            </T>
          </View>
          <Badge label="Soon" tone="amber" />
        </View>
      ))}
    </Card>
  );
}

function TonightCard() {
  const k = useKitchen();
  const today = formatDateISO(new Date());
  // Skip meals still waiting for the AI chef (no recipe yet).
  const meals = (k.week?.plan.days.find((d) => d.date === today)?.meals ?? []).filter((m) => !m.needsAI);
  const meal = meals.find((m) => m.type === 'dinner') ?? meals[meals.length - 1];
  useFreshMealPhotos(meal ? [meal] : undefined);
  const openItems = k.items.filter((i) => !i.checked).length;

  if (k.loading) return null;
  return (
    <>
      {meal ? (
        <Card style={styles.dinner}>
          <Photo uri={mealImage(meal)} size={92} radius={18} />
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
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/kitchen', params: { section: 'shopping' } })}
          style={styles.shopCard}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T size={12.5} weight="bold" color={colors.sageDark} style={{ letterSpacing: 0.4 }}>
              SHOPPING LIST
            </T>
            <Badge label={`${openItems} to buy`} tone="sage" />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {k.items
              .filter((i) => !i.checked)
              .slice(0, 5)
              .map((i) => (
                <View key={i.id} style={styles.shopItem}>
                  <T size={13} weight="semibold">
                    {i.name}
                  </T>
                </View>
              ))}
            {openItems > 5 ? (
              <T size={13} color={colors.muted} style={{ alignSelf: 'center' }}>{`+${openItems - 5} more`}</T>
            ) : null}
          </View>
          <T size={13.5} weight="bold" color={colors.sageDark}>
            Open the shopping list ›
          </T>
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
      <UseSoonCard />
      <TonightCard />
      <Card style={{ gap: 6 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          HALAL NEAR YOU
        </T>
        <T size={15}>Restaurants, butchers, groceries and mosques around you, with directions.</T>
        <Button label="Find halal places" variant="secondary" onPress={() => router.push('/halal')} />
      </Card>
      <MoneyCard />
      <ComingSoonCard />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  shopCard: { gap: 10, backgroundColor: '#EEF4EA', borderWidth: 1, borderColor: '#CFE0C6', borderRadius: 20, padding: 16 },
  shopItem: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#CFE0C6' },
  soonDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  warn: { gap: 8, backgroundColor: '#FFF4E0', borderWidth: 1, borderColor: '#F0D29A', borderRadius: 20, padding: 16 },
  warnRed: { backgroundColor: '#FCEAE6', borderColor: '#EDB9AE' },
  prayer: { backgroundColor: colors.espresso, borderRadius: 24, padding: 20, overflow: 'hidden' },
  star: { position: 'absolute', right: -50, top: -40, opacity: 0.35 },
  row: { flexDirection: 'row', gap: 6, marginTop: 18 },
  cell: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 4, gap: 2 },
  cellActive: { backgroundColor: colors.gold },
  dinner: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14 },
  shopping: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
});
