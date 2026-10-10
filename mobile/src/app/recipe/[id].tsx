import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/art';
import { Badge, Photo } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import { addShoppingItems, checkRecipe, isSafeFor, loadRecipes, recipeAllergens, recipeImage, totalMinutes, type RecipeRow } from '@/lib/kitchen';
import { refreshShopping, useKitchen } from '@/lib/kitchen-store';
import { formatPortions } from '@/shared/pantry-portions';
import { colors } from '@/theme';

const STATUS: Record<string, { label: string; color: string }> = {
  enough: { label: 'have', color: colors.sage },
  'have-some': { label: 'have', color: colors.sage },
  staple: { label: 'have', color: colors.sage },
  basic: { label: 'cupboard', color: colors.muted },
  optional: { label: 'optional', color: colors.muted },
  'staple-low': { label: 'running low', color: '#8A5A16' },
  short: { label: 'not enough', color: '#8A5A16' },
  missing: { label: 'to buy', color: colors.brickText },
};

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const k = useKitchen();
  const [recipe, setRecipe] = useState<RecipeRow | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadRecipes()
      .then((all) => setRecipe(all.find((r) => r.id === id) ?? null))
      .catch(() => setRecipe(null));
  }, [id]);

  const portions = k.household?.portions ?? 2;
  const check = useMemo(() => (recipe ? checkRecipe(recipe, k.pantry, portions) : null), [recipe, k.pantry, portions]);
  const toBuy = check?.lines.filter((l) => l.status === 'missing' || l.status === 'short') ?? [];
  const allergies = k.prefs?.allergies ?? [];

  if (recipe === undefined) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.walnut} />
      </SafeAreaView>
    );
  }
  if (!recipe || !check) {
    return (
      <SafeAreaView style={[styles.center, { padding: 24, gap: 12 }]}>
        <T>This recipe could not be found.</T>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const safe = isSafeFor(recipe, allergies);
  const found = recipeAllergens(recipe);
  const steps = recipe.recipe_steps.slice().sort((a, b) => a.step_number - b.step_number);
  const h = k.household;

  const addMissing = async () => {
    if (!k.listId) return;
    setAdding(true);
    try {
      const added = await addShoppingItems(
        k.listId,
        toBuy.map((l) => l.shortfall ?? { name: l.need.name, quantity: l.scaled, unit: l.need.unit }),
        k.items
      );
      await refreshShopping();
      Alert.alert(added ? `Added ${added} to Shopping` : 'Already on your list');
    } catch (e) {
      Alert.alert('Could not add', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Photo uri={recipeImage(recipe)} height={280} radius={0} />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={[styles.back, { top: insets.top + 8 }]}>
          <Icon name="back" size={20} color={colors.espresso} />
        </Pressable>

        <View style={styles.sheet}>
          <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
            {`${(recipe.cuisine?.name ?? 'Halal').toUpperCase()} · ${totalMinutes(recipe) || '–'} MIN`}
          </T>
          <T weight="extrabold" size={28} style={{ letterSpacing: -0.5, marginTop: 4 }} accessibilityRole="header">
            {recipe.name}
          </T>
          {recipe.short_description ? (
            <T size={14.5} color="#5F5048" style={{ marginTop: 6, lineHeight: 21 }}>
              {recipe.short_description}
            </T>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {allergies.length ? (
              <Badge label={safe ? `Safe: no ${allergies.join(', ').toLowerCase()}` : 'Contains a family allergy'} tone={safe ? 'sage' : 'brick'} />
            ) : null}
            <Badge label="Halal ingredients" tone="walnut" />
            {found.length && !allergies.length ? <Badge label={`Contains ${found.join(', ').toLowerCase()}`} tone="amber" /> : null}
          </View>

          <Card style={styles.portions}>
            <View style={{ flex: 1 }}>
              <T weight="bold">Sized for your family</T>
              <T size={12.5} color={colors.muted}>
                {h ? `${h.people} people${h.children ? `, ${h.children} child${h.children === 1 ? '' : 'ren'}` : ''} · recipe serves ${recipe.servings ?? '–'}` : 'Add your family in Family to size portions'}
              </T>
            </View>
            <T weight="extrabold" size={22} color={colors.walnut}>
              {formatPortions(portions)}
            </T>
          </Card>

          <View style={styles.sectionHead}>
            <T weight="bold" size={17}>
              Ingredients
            </T>
            {k.pantry.length ? (
              <T size={13} weight="bold" color={toBuy.length ? '#8A5A16' : colors.sage}>
                {toBuy.length ? `${toBuy.length} to buy` : 'All at home'}
              </T>
            ) : null}
          </View>
          <Card style={{ paddingVertical: 2 }}>
            {check.lines.map((l, i) => {
              const s = STATUS[l.status] ?? STATUS.missing!;
              return (
                <View key={`${l.need.name}-${i}`} style={[styles.ing, i < check.lines.length - 1 && styles.line]}>
                  <T size={14.5} style={{ flex: 1 }}>
                    {l.need.name}
                  </T>
                  <T size={13} color={colors.muted}>
                    {l.neededText}
                  </T>
                  {k.pantry.length ? (
                    <T size={12.5} weight="bold" color={s.color} style={{ width: 76, textAlign: 'right' }}>
                      {s.label}
                    </T>
                  ) : null}
                </View>
              );
            })}
          </Card>

          <T weight="bold" size={17} style={{ marginTop: 22, marginBottom: 8 }}>
            Method
          </T>
          <View style={{ gap: 12 }}>
            {steps.map((s, i) => (
              <View key={s.step_number} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.stepNo}>
                  <T size={13} weight="bold" color={colors.walnut}>
                    {i + 1}
                  </T>
                </View>
                <T size={15} style={{ flex: 1, lineHeight: 22 }}>
                  {s.instruction}
                </T>
              </View>
            ))}
          </View>
          <T size={12} color={colors.muted} style={{ marginTop: 18, lineHeight: 18 }}>
            Allergy labels are worked out from the ingredient names. Always check the labels on the products you buy, and choose halal-certified meat, stock and gelatin.
          </T>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {toBuy.length ? (
          <Button label={k.pantry.length ? `Add ${toBuy.length} missing to Shopping` : `Add ${toBuy.length} ingredients to Shopping`} onPress={addMissing} busy={adding} />
        ) : (
          <Button label="All set — enjoy cooking" variant="secondary" onPress={() => router.back()} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  center: { flex: 1, backgroundColor: colors.linen, alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -24, backgroundColor: colors.linen, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  portions: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 8 },
  ing: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
  stepNo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.linen, borderTopWidth: 1, borderTopColor: colors.line },
});
