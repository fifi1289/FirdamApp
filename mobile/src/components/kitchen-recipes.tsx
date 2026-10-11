import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Badge, Chip, Photo } from '@/components/kitchen-ui';
import { Button, T } from '@/components/ui';
import { checkRecipe, fitsDiets, isSafeFor, loadRecipes, recipeImage, totalMinutes, type RecipeRow } from '@/lib/kitchen';
import { useKitchen } from '@/lib/kitchen-store';
import { colors, fonts } from '@/theme';

type Filter = 'safe' | 'quick' | 'cook';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const DIETS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Low-carb', 'High-protein', 'Kid-friendly'];

/** Recipes shown per page; "Show more" adds the next page. */
const PAGE_SIZE = 40;

export function RecipesView() {
  const k = useKitchen();
  const [recipes, setRecipes] = useState<RecipeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Set<Filter>>(new Set(['safe']));
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [meal, setMeal] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [diet, setDiet] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  // A new search or filter starts again from the top.
  useEffect(() => setLimit(PAGE_SIZE), [query, filters, meal, cuisine, diet]);

  useEffect(() => {
    loadRecipes()
      .then(setRecipes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load recipes.'));
  }, []);

  const allergies = k.prefs?.allergies ?? [];
  const diets = k.prefs?.dietaryPreferences ?? [];
  const portions = k.household?.portions ?? 2;

  // Cuisines in the library, most recipes first.
  const cuisines = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of recipes ?? []) if (r.cuisine?.name) count.set(r.cuisine.name, (count.get(r.cuisine.name) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [recipes]);

  const shown = useMemo(() => {
    if (!recipes) return [];
    const q = query.trim().toLowerCase();
    return recipes
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.cuisine?.name ?? '').toLowerCase().includes(q))
      .filter((r) => !filters.has('safe') || (isSafeFor(r, allergies) && fitsDiets(r, diets)))
      .filter((r) => !filters.has('quick') || totalMinutes(r) <= 30)
      .filter((r) => !meal || (r.meal_type?.name ?? '').toLowerCase().includes(meal))
      .filter((r) => !cuisine || r.cuisine?.name === cuisine)
      .filter((r) => !diet || fitsDiets(r, [diet]))
      .map((r) => ({ r, check: k.pantry.length ? checkRecipe(r, k.pantry, portions) : null }))
      .filter(({ check }) => !filters.has('cook') || (check && check.verdict !== 'far'))
      .sort((a, b) => (filters.has('cook') && a.check && b.check ? a.check.missingCount - b.check.missingCount : 0));
  }, [recipes, query, filters, meal, cuisine, diet, allergies, diets, k.pantry, portions]);

  const toggle = (f: Filter) =>
    setFilters((cur) => {
      const next = new Set(cur);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const active = [
    ...(filters.has('safe') ? [{ label: allergies.length ? 'Safe for my family' : 'Fits my diet', clear: () => toggle('safe') }] : []),
    ...(filters.has('quick') ? [{ label: '30 min or less', clear: () => toggle('quick') }] : []),
    ...(filters.has('cook') ? [{ label: 'Cook with what I have', clear: () => toggle('cook') }] : []),
    ...(meal ? [{ label: meal[0].toUpperCase() + meal.slice(1), clear: () => setMeal(null) }] : []),
    ...(diet ? [{ label: diet, clear: () => setDiet(null) }] : []),
    ...(cuisine ? [{ label: cuisine, clear: () => setCuisine(null) }] : []),
  ];
  const activeCount = active.length;

  if (error) return <T color={colors.brickText}>{error}</T>;
  if (!recipes) return <ActivityIndicator color={colors.walnut} style={{ marginTop: 24 }} />;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${recipes.length} halal recipes`}
          placeholderTextColor="#9C8D84"
          accessibilityLabel="Search recipes"
          style={[styles.search, { flex: 1 }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => setSheet(true)} style={styles.filterBtn}>
          <T size={14} weight="bold" color={colors.linen}>
            {activeCount ? `Filters · ${activeCount}` : 'Filters'}
          </T>
        </Pressable>
      </View>
      {activeCount ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {active.map((f) => (
            <Chip key={f.label} label={`${f.label}  ✕`} selected onPress={f.clear} />
          ))}
        </ScrollView>
      ) : null}

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(false)} accessibilityLabel="Close filters">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView contentContainerStyle={{ gap: 16 }}>
              <T weight="extrabold" size={20}>
                Filters
              </T>
              <Section title="For">
                <Chip label={allergies.length ? 'Safe for my family' : 'Fits my diet'} selected={filters.has('safe')} onPress={() => toggle('safe')} tone="sage" />
                <Chip label="30 min or less" selected={filters.has('quick')} onPress={() => toggle('quick')} />
                {k.pantry.length ? <Chip label="Cook with what I have" selected={filters.has('cook')} onPress={() => toggle('cook')} /> : null}
              </Section>
              <Section title="Meal">
                {MEALS.map((m) => (
                  <Chip key={m} label={m[0].toUpperCase() + m.slice(1)} selected={meal === m} onPress={() => setMeal(meal === m ? null : m)} />
                ))}
              </Section>
              <Section title="Diet">
                {DIETS.map((d) => (
                  <Chip key={d} label={d} selected={diet === d} onPress={() => setDiet(diet === d ? null : d)} tone="sage" />
                ))}
              </Section>
              <Section title="Cuisine">
                {cuisines.map((c) => (
                  <Chip key={c} label={c} selected={cuisine === c} onPress={() => setCuisine(cuisine === c ? null : c)} />
                ))}
              </Section>
              <Button label={`Show ${shown.length} recipe${shown.length === 1 ? '' : 's'}`} onPress={() => setSheet(false)} />
              <Button
                label="Clear all"
                variant="text"
                onPress={() => {
                  setMeal(null);
                  setCuisine(null);
                  setDiet(null);
                  setFilters(new Set());
                }}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <T size={12.5} color={colors.muted}>
        {shown.length > limit ? `Showing ${limit} of ${shown.length} recipes` : `${shown.length} recipe${shown.length === 1 ? '' : 's'}`}
        {filters.has('safe') && allergies.length ? ` · without ${allergies.join(', ').toLowerCase()}` : ''}
        {filters.has('safe') && diets.length ? ` · ${diets.join(', ').toLowerCase()}` : ''}
      </T>

      {shown.slice(0, limit).map(({ r, check }) => (
        <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} style={styles.card}>
          <Photo uri={recipeImage(r)} size={76} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <T size={11.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }} numberOfLines={1}>
              {`${(r.cuisine?.name ?? 'Halal').toUpperCase()} · ${totalMinutes(r) || '–'} MIN`}
            </T>
            <T size={15.5} weight="bold" numberOfLines={2}>
              {r.name}
            </T>
            {check ? (
              <Badge
                label={check.verdict === 'ready' ? 'Cook now' : check.missingCount + check.shortCount === 1 ? '1 thing to buy' : `${check.missingCount + check.shortCount} things to buy`}
                tone={check.verdict === 'ready' ? 'sage' : check.verdict === 'almost' ? 'amber' : 'walnut'}
              />
            ) : null}
          </View>
        </Pressable>
      ))}
      {shown.length > limit ? (
        <Button
          label={`Show ${Math.min(PAGE_SIZE, shown.length - limit)} more`}
          variant="secondary"
          onPress={() => setLimit((n) => n + PAGE_SIZE)}
        />
      ) : null}
      {shown.length === 0 ? (
        <T size={14} color={colors.muted}>
          No recipes match. Try fewer filters.
        </T>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        {title.toUpperCase()}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBtn: { height: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.espresso, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(40,28,20,0.35)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: colors.linen, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  search: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.espresso },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 10 },
});
