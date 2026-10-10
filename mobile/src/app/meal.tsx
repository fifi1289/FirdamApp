import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/art';
import { Badge, Photo } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import { addShoppingItems, mealConflicts, mealNeeds } from '@/lib/kitchen';
import { refreshShopping, useKitchen } from '@/lib/kitchen-store';
import { checkNeeds } from '@/shared/pantry-engine';
import { formatPortions } from '@/shared/pantry-portions';
import { colors } from '@/theme';

/** A meal the AI chef wrote (not from the recipe library). */
export default function MealScreen() {
  const { date, type } = useLocalSearchParams<{ date: string; type: string }>();
  const insets = useSafeAreaInsets();
  const k = useKitchen();
  const [adding, setAdding] = useState(false);
  // Once added, the button rests so a second tap doesn't add the amounts again.
  const [added, setAdded] = useState(false);
  const meal = k.week?.plan.days.find((d) => d.date === date)?.meals.find((m) => m.type === type) ?? null;
  const check = useMemo(() => (meal ? checkNeeds(mealNeeds(meal), k.pantry) : null), [meal, k.pantry]);

  if (!meal || !check) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }]}>
        <T>This meal is no longer in your plan.</T>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
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
      Alert.alert(added ? `Added to Shopping (${added})` : 'Already on your list', added ? 'If the food was already on the list, the amounts were added together.' : undefined);
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Photo uri={meal.image} height={240} radius={0} />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={[styles.back, { top: insets.top + 8 }]}>
          <Icon name="back" size={20} color={colors.espresso} />
        </Pressable>
        <View style={styles.sheet}>
          <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
            {`${meal.type.toUpperCase()} · ${meal.prepTime + meal.cookTime} MIN · FOR ${formatPortions(meal.servings)}`}
          </T>
          <T weight="extrabold" size={26} style={{ marginTop: 4 }} accessibilityRole="header">
            {meal.name}
          </T>
          {meal.description ? (
            <T size={14.5} color="#5F5048" style={{ marginTop: 6, lineHeight: 21 }}>
              {meal.description}
            </T>
          ) : null}
          <View style={{ marginTop: 10 }}>
            {k.prefs?.allergies.length && mealConflicts(meal, k.prefs.allergies) ? (
              <Badge label="Contains a family allergy — make a new plan or skip this meal" tone="brick" />
            ) : (
              <Badge label="Written by the AI chef — check labels for allergens" tone="amber" />
            )}
          </View>
          <T weight="bold" size={17} style={{ marginTop: 20, marginBottom: 8 }}>
            Ingredients
          </T>
          <Card style={{ paddingVertical: 2 }}>
            {meal.ingredients.map((i, idx) => (
              <View key={`${i.name}-${idx}`} style={[styles.row, idx < meal.ingredients.length - 1 && styles.line]}>
                <T size={14.5} style={{ flex: 1 }}>
                  {i.name}
                </T>
                <T size={13} color={colors.muted}>{`${i.quantity} ${i.unit}`.trim()}</T>
              </View>
            ))}
          </Card>
          <T weight="bold" size={17} style={{ marginTop: 20, marginBottom: 8 }}>
            Method
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
          <Button label={added ? 'Added to Shopping' : `Add ${toBuy.length} to Shopping`} onPress={addMissing} busy={adding} disabled={added} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -24, backgroundColor: colors.linen, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
  stepNo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.linen, borderTopWidth: 1, borderTopColor: colors.line },
});
