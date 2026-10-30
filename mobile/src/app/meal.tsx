import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/art';
import { Badge, Photo } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import { addShoppingItems, markHave, mealConflicts, mealImage, mealNeeds } from '@/lib/kitchen';
import { refreshKitchen, refreshShopping, useKitchen } from '@/lib/kitchen-store';
import { checkNeeds, type Line } from '@/shared/pantry-engine';
import { formatPortions } from '@/shared/pantry-portions';
import { colors } from '@/theme';
import { showAlert } from '@/components/firdam-alert';
import { ToBuyButton } from '@/components/to-buy-button';
import { tr } from '@/lib/i18n';

/** A meal the AI chef wrote (not from the recipe library). */
export default function MealScreen() {
  const { date, type } = useLocalSearchParams<{ date: string; type: string }>();
  const insets = useSafeAreaInsets();
  const k = useKitchen();
  const [adding, setAdding] = useState(false);
  // Once added, the button rests so a second tap doesn't add the amounts again.
  const [added, setAdded] = useState(false);
  // This week's plan or next week's.
  const meal =
    [k.week, k.nextWeek].flatMap((w) => w?.plan.days ?? []).find((d) => d.date === date)?.meals.find((m) => m.type === type) ?? null;
  const [having, setHaving] = useState<string | null>(null);
  const haveIt = async (l: Line) => {
    if (having) return;
    setHaving(l.need.name);
    try {
      await markHave(l);
      await refreshKitchen();
    } catch (e) {
      showAlert(tr('Could not add it to the pantry'), e instanceof Error ? e.message : tr('Please try again.'));
    } finally {
      setHaving(null);
    }
  };
  const check = useMemo(() => (meal ? checkNeeds(mealNeeds(meal), k.pantry) : null), [meal, k.pantry]);

  if (!meal || !check) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }]}>
        <T>{tr('This meal is no longer in your plan.')}</T>
        <Button label={tr('Back')} variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }
  const toBuy = check.lines.filter((l) => l.status === 'missing' || l.status === 'short');

  const addMissing = async () => {
    if (!k.listId) return;
    setAdding(true);
    try {
      const added = await addShoppingItems(k.listId, toBuy.map((l) => l.shortfall ?? { name: l.need.name, quantity: l.scaled, unit: l.need.unit }), k.items);
      await refreshShopping();
      setAdded(true);
      showAlert(added ? tr('Added to Shopping ({0})', [added]) : tr('Already on your list'), added ? tr('If the food was already on the list, the amounts were added together.') : undefined);
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Photo uri={mealImage(meal)} height={240} radius={0} />
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => router.back()} style={[styles.back, { top: insets.top + 8 }]}>
          <Icon name="back" size={20} color={colors.espresso} />
        </Pressable>
        <View style={styles.sheet}>
          <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
            {tr('{0} · {1} MIN · FOR {2}', [meal.type.toUpperCase(), meal.prepTime + meal.cookTime, formatPortions(meal.servings)])}
          </T>
          <T weight="extrabold" size={26} style={{ marginTop: 4 }} accessibilityRole="header">
            {meal.name}
          </T>
          {meal.description ? (
            <T size={14.5} color="#5F5048" style={{ marginTop: 6, lineHeight: 21 }}>
              {tr(meal.description)}
            </T>
          ) : null}
          <View style={{ marginTop: 10 }}>
            {k.prefs?.allergies.length && mealConflicts(meal, k.prefs.allergies) ? (
              <Badge label={tr('Contains a family allergy — make a new plan or skip this meal')} tone="brick" />
            ) : (
              <Badge label={tr('Written by the AI chef — check labels for allergens')} tone="amber" />
            )}
          </View>
          <T weight="bold" size={17} style={{ marginTop: 20, marginBottom: 8 }}>
            {tr('Ingredients')}
          </T>
          <Card style={{ paddingVertical: 2 }}>
            {check.lines.map((l, idx) => (
              <View key={`${l.need.name}-${idx}`} style={[styles.row, idx < check.lines.length - 1 && styles.line]}>
                <T size={14.5} style={{ flex: 1 }}>
                  {l.need.name}
                </T>
                <T size={13} color={colors.muted}>
                  {l.neededText}
                </T>
                {l.status === 'missing' || l.status === 'short' ? (
                  <View style={{ alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
                    <ToBuyButton line={l} label={l.status === 'short' ? tr('not enough') : tr('to buy')} color={l.status === 'short' ? '#8A5A16' : colors.brickText} />
                    <Pressable accessibilityRole="button" accessibilityLabel={tr('I have {0}', [l.need.name])} onPress={() => haveIt(l)} style={styles.have} hitSlop={6}>
                      <T size={11.5} weight="bold" color={colors.sageDark}>
                        {having === l.need.name ? '…' : tr('I have it')}
                      </T>
                    </Pressable>
                  </View>
                ) : l.status === 'enough' ? (
                  <T size={12.5} weight="bold" color={colors.sage} style={{ marginLeft: 8 }}>
                    {tr('at home')}
                  </T>
                ) : null}
              </View>
            ))}
          </Card>
          <T weight="bold" size={17} style={{ marginTop: 20, marginBottom: 8 }}>
            {tr('Method')}
          </T>
          <View style={{ gap: 12 }}>
            {meal.recipe.map((s, idx) => (
              <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.stepNo}>
                  <T size={13} weight="bold" color={colors.walnut}>
                    {idx + 1}
                  </T>
                </View>
                <T size={15} style={{ flex: 1, lineHeight: 22 }}>
                  {s}
                </T>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {toBuy.length ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Button label={added ? tr('Added to Shopping') : tr('Add {0} to Shopping', [toBuy.length])} onPress={addMissing} busy={adding} disabled={added} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  have: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#CFE0C6', backgroundColor: '#EEF4EA' },
  screen: { flex: 1, backgroundColor: colors.linen },
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -24, backgroundColor: colors.linen, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
  stepNo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.linen, borderTopWidth: 1, borderTopColor: colors.line },
});
