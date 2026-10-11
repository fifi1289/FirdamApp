import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StarPattern } from '@/components/art';
import { Badge, Chip, Photo } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import {
  AI_PLANS_PER_MONTH,
  AIPlanError,
  addShoppingItems,
  aiSwapMeal,
  buildAIPlan,
  buildLibraryPlan,
  formatDateISO,
  getStartOfWeek,
  loadRecipes,
  mealNeeds,
  saveWeekPlan,
  shoppingForPlan,
  type MockMeal,
} from '@/lib/kitchen';
import { patchKitchen, refreshShopping, useKitchen } from '@/lib/kitchen-store';
import { askForAlerts } from '@/lib/adhan-alerts';
import { scheduleWeeklyPlanReminder } from '@/lib/weekly-plan-alert';
import { checkNeeds } from '@/shared/pantry-engine';
import { getMealImage } from '@/shared/meal-images';
import { swapPlanMeal } from '@/shared/plan-core';
import { formatPortions } from '@/shared/pantry-portions';
import { colors } from '@/theme';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPE_LABEL: Record<string, string> = { breakfast: 'BREAKFAST', lunch: 'LUNCH', dinner: 'DINNER', snack: 'SNACK' };

export function openMeal(meal: MockMeal, date: string) {
  if (UUID.test(meal.id)) router.push({ pathname: '/recipe/[id]', params: { id: meal.id } });
  else router.push({ pathname: '/meal', params: { date, type: meal.type } });
}

function weekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function PlanView() {
  const k = useKitchen();
  const today = formatDateISO(new Date());
  // This week, or next week (ready at the end of the week).
  const [offset, setOffset] = useState<0 | 1>(() => (new Date().getDay() === 0 && k.nextWeek ? 1 : 0));
  const weekStartDate = useMemo(() => {
    const d = getStartOfWeek();
    d.setDate(d.getDate() + offset * 7);
    return d;
  }, [offset]);
  const days = useMemo(() => weekDays(weekStartDate), [weekStartDate]);
  const [selected, setSelected] = useState(offset ? formatDateISO(weekStartDate) : today);
  const wk = offset ? k.nextWeek : k.week;
  const weekKey = offset ? 'nextWeek' : 'week';
  const switchWeek = (o: 0 | 1) => {
    setOffset(o);
    const d = getStartOfWeek();
    d.setDate(d.getDate() + o * 7);
    setSelected(o ? formatDateISO(d) : today);
  };
  const [busy, setBusy] = useState<'ai' | 'library' | 'shop' | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);

  const plan = wk?.plan ?? null;
  const day = plan?.days.find((d) => d.date === selected) ?? null;
  const limit = k.paid ? AI_PLANS_PER_MONTH.paid : AI_PLANS_PER_MONTH.free;
  const aiLeft = Math.max(0, limit - k.aiUsed);
  const portions = k.household?.portions ?? 2;

  // Replace one meal: from the recipe library (unlimited) or by the AI chef
  // (its own monthly allowance, separate from whole AI plans).
  const swapFrom = async (m: MockMeal, source: 'library' | 'ai') => {
    if (!wk || !k.prefs || swapping) return;
    setSwapping(`${selected}-${m.type}`);
    try {
      const portions = k.household?.portions ?? 2;
      let next = wk.plan;
      let note: string | null = null;
      if (source === 'library') {
        const res = swapPlanMeal(wk.plan, selected, m.type, await loadRecipes(), k.prefs, portions);
        if (!res) {
          Alert.alert('No other library recipe fits', 'Try “Ask the AI chef” — it can write a new dish that suits your family.');
          return;
        }
        next = res.plan;
        note = res.note;
      } else {
        const avoid = wk.plan.days.flatMap((d) => d.meals.map((x) => x.name));
        const meal = await aiSwapMeal(k.prefs, portions, m.type, avoid);
        if (!meal.image) meal.image = getMealImage(meal.name, m.type);
        next = {
          ...wk.plan,
          days: wk.plan.days.map((d) => (d.date !== selected ? d : { ...d, meals: d.meals.map((x) => (x.type === m.type ? meal : x)) })),
        };
      }
      const id = await saveWeekPlan(next, k.prefs, wk.id);
      patchKitchen({ [weekKey]: { id, plan: next } });
      if (note) Alert.alert('Swapped', note);
    } catch (e) {
      Alert.alert('Could not swap this meal', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSwapping(null);
    }
  };
  const swap = (m: MockMeal) =>
    Alert.alert(`Swap this ${m.type}`, 'Library swaps are unlimited. AI chef swaps: 5 a month on the free plan, 40 with Firdam Family.', [
      { text: 'From the recipe library', onPress: () => swapFrom(m, 'library') },
      { text: 'Ask the AI chef', onPress: () => swapFrom(m, 'ai') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const generate = async (useAI: boolean) => {
    if (!k.prefs) return;
    const run = async () => {
      setBusy(useAI ? 'ai' : 'library');
      const weekStart = formatDateISO(weekStartDate);
      const prefs = { ...k.prefs!, planningDuration: 7 };
      try {
        let next;
        if (useAI) {
          try {
            next = await buildAIPlan(prefs, portions, k.pantry, weekStart);
            patchKitchen({ aiUsed: k.aiUsed + 1 });
          } catch (e) {
            const used = e instanceof AIPlanError && (e.status === 402 || e.status === 429);
            Alert.alert(
              used ? 'No AI plans left this month' : 'The AI chef is busy',
              used ? 'Here is a plan from the recipe library instead — those are always unlimited.' : 'Here is a plan from the recipe library instead.'
            );
            if (used) patchKitchen({ aiUsed: limit });
            next = await buildLibraryPlan(prefs, portions, k.pantry, weekStart);
          }
        } else {
          next = await buildLibraryPlan(prefs, portions, k.pantry, weekStart);
        }
        const id = await saveWeekPlan(next, prefs, wk?.id ?? null);
        patchKitchen({ [weekKey]: { id, plan: next } });
        Alert.alert('Your new plan is ready', 'Tap any day to see its meals. Use “Swap” on a meal to change just that one. Each Sunday Firdam prepares next week’s plan and lets you know.');
        askForAlerts().then((ok) => ok && scheduleWeeklyPlanReminder()).catch(() => {});
      } catch (e) {
        Alert.alert('Could not plan your week', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setBusy(null);
      }
    };
    if (wk) {
      Alert.alert(offset ? 'Replace next week’s plan?' : 'Replace this week’s plan?', 'Your family will see the new plan on the website and in the app.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: run },
      ]);
    } else run();
  };

  const shopForWeek = async () => {
    if (!plan || !k.listId) return;
    setBusy('shop');
    try {
      const needs = shoppingForPlan(plan, k.pantry, offset ? formatDateISO(weekStartDate) : today, k.items);
      const added = await addShoppingItems(k.listId, needs.map((n) => ({ ...n, fromMealPlan: true })), k.items);
      await refreshShopping();
      Alert.alert(added ? `Updated ${added} item${added === 1 ? '' : 's'}` : 'Nothing to add', added ? 'Amounts for the same food are added together. Find them in Shopping.' : 'Your pantry and list already cover the rest of this week.');
    } catch (e) {
      Alert.alert('Could not update the list', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="This week" selected={offset === 0} onPress={() => switchWeek(0)} />
        <Chip label={k.nextWeek ? 'Next week · ready' : 'Next week'} selected={offset === 1} onPress={() => switchWeek(1)} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {days.map((d) => {
          const iso = formatDateISO(d);
          const on = iso === selected;
          const has = !!plan?.days.find((x) => x.date === iso)?.meals.length;
          return (
            <Pressable key={iso} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSelected(iso)} style={[styles.day, on && styles.dayOn]}>
              <T size={11} weight="semibold" color={on ? colors.linen : colors.muted}>
                {d.toLocaleDateString('en-CA', { weekday: 'short' })}
              </T>
              <T size={17} weight="extrabold" color={on ? colors.linen : colors.espresso}>
                {d.getDate()}
              </T>
              <View style={[styles.dot, { backgroundColor: has ? (on ? colors.gold : colors.walnut) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </ScrollView>

      {day?.meals.length ? (
        <View style={{ gap: 10 }}>
          {day.meals.map((m) => {
            const check = checkNeeds(mealNeeds(m), k.pantry);
            const total = check.lines.filter((l) => l.status !== 'optional').length;
            const missing = check.missingCount + check.shortCount;
            return (
              <Pressable key={`${m.type}-${m.id}`} accessibilityRole="button" onPress={() => openMeal(m, selected)} style={styles.meal}>
                <Photo uri={m.image} size={64} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={11.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
                    {TYPE_LABEL[m.type] ?? m.type.toUpperCase()}
                  </T>
                  <T size={15} weight="bold" numberOfLines={1}>
                    {m.name}
                  </T>
                  {k.pantry.length ? (
                    <T size={12.5} weight="semibold" color={missing ? '#8A5A16' : colors.sage}>
                      {missing ? `${total - missing} of ${total} at home · ${missing} to buy` : `All ${total} ingredients at home`}
                    </T>
                  ) : (
                    <T size={12.5} color={colors.muted}>{`${m.prepTime + m.cookTime} min · for ${formatPortions(m.servings)}`}</T>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Swap ${m.type}`}
                  hitSlop={10}
                  onPress={() => swap(m)}
                  style={styles.swap}
                >
                  <T size={12.5} weight="bold" color={colors.walnut}>
                    {swapping === `${selected}-${m.type}` ? '…' : 'Swap'}
                  </T>
                </Pressable>
              </Pressable>
            );
          })}
          <Button label="Add this week’s missing food to Shopping" variant="secondary" onPress={shopForWeek} busy={busy === 'shop'} />
        </View>
      ) : (
        <Card>
          <T size={14.5} color={colors.muted}>
            {plan ? 'No meals planned for this day.' : 'No plan for this week yet. Let Firdam plan it for you.'}
          </T>
        </Card>
      )}

      <View style={styles.planCard}>
        <View style={styles.planStar} pointerEvents="none">
          <StarPattern size={150} strokeWidth={1} />
        </View>
        <T weight="extrabold" size={17}>
          {plan ? (offset ? 'Plan next week again' : 'Plan this week again') : offset ? 'Plan next week' : 'Plan my week'}
        </T>
        <T size={13.5} color="#5F5048" style={{ marginTop: 4, lineHeight: 20 }}>
          {`For ${formatPortions(portions)} portions`}
          {k.prefs?.allergies.length ? ` · no ${k.prefs.allergies.join(', ').toLowerCase()}` : ''}
          {k.prefs?.usePantryFirst ? ' · uses your pantry first' : ''}
        </T>
        <View style={{ gap: 8, marginTop: 14 }}>
          {aiLeft > 0 ? <Button label={`Plan with the AI chef (${aiLeft} left this month)`} onPress={() => generate(true)} busy={busy === 'ai'} disabled={!!busy} /> : null}
          <Button label="Quick plan from the recipe library" variant={aiLeft > 0 ? 'secondary' : 'primary'} onPress={() => generate(false)} busy={busy === 'library'} disabled={!!busy} />
          <Pressable accessibilityRole="button" onPress={() => router.push('/meal-preferences')} style={styles.filters}>
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              PLAN FILTERS
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {[
                ...(k.prefs?.mealTypes ?? []).map((m) => m[0].toUpperCase() + m.slice(1)),
                ...(k.prefs?.dietaryPreferences ?? []).filter((d) => d.toLowerCase() !== 'halal'),
                ...Object.values(k.prefs?.cuisinePreferences ?? {}).flat(),
                ...(k.prefs?.usePantryFirst ? ['Pantry first'] : []),
              ]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((f) => (
                  <Badge key={f} label={f} tone="walnut" />
                ))}
            </View>
            <T size={13} weight="bold" color={colors.walnut}>
              Change meals, diets, cuisines ›
            </T>
          </Pressable>
        </View>
        {aiLeft === 0 ? (
          <View style={{ marginTop: 6 }}>
            <Badge label="AI chef plans refresh next month · library plans are unlimited" tone="walnut" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { width: 48, paddingVertical: 8, borderRadius: 14, alignItems: 'center', gap: 2 },
  dayOn: { backgroundColor: colors.walnut },
  swap: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  meal: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 10 },
  filters: { gap: 8, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12 },
  planCard: { backgroundColor: colors.tint, borderRadius: 24, padding: 18, overflow: 'hidden' },
  planStar: { position: 'absolute', right: -40, bottom: -50, opacity: 0.6 },
});
