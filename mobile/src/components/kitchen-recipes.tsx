import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge, Chip, Photo } from '@/components/kitchen-ui';
import { Button, T } from '@/components/ui';
import { checkRecipe, fitsDiets, isSafeFor, loadRecipes, recipeImage, totalMinutes, type RecipeRow } from '@/lib/kitchen';
import { useKitchen } from '@/lib/kitchen-store';
import { colors, fonts } from '@/theme';

type Filter = 'safe' | 'quick' | 'cook';

/** Recipes shown per page; "Show more" adds the next page. */
const PAGE_SIZE = 40;

export function RecipesView() {
  const k = useKitchen();
  const [recipes, setRecipes] = useState<RecipeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Set<Filter>>(new Set(['safe']));
  const [limit, setLimit] = useState(PAGE_SIZE);
  // A new search or filter starts again from the top.
  useEffect(() => setLimit(PAGE_SIZE), [query, filters]);

  useEffect(() => {
    loadRecipes()
      .then(setRecipes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load recipes.'));
  }, []);

  const allergies = k.prefs?.allergies ?? [];
  const diets = k.prefs?.dietaryPreferences ?? [];
  const portions = k.household?.portions ?? 2;

  const shown = useMemo(() => {
    if (!recipes) return [];
    const q = query.trim().toLowerCase();
    return recipes
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.cuisine?.name ?? '').toLowerCase().includes(q))
      .filter((r) => !filters.has('safe') || (isSafeFor(r, allergies) && fitsDiets(r, diets)))
      .filter((r) => !filters.has('quick') || totalMinutes(r) <= 30)
      .map((r) => ({ r, check: k.pantry.length ? checkRecipe(r, k.pantry, portions) : null }))
      .filter(({ check }) => !filters.has('cook') || (check && check.verdict !== 'far'))
      .sort((a, b) => (filters.has('cook') && a.check && b.check ? a.check.missingCount - b.check.missingCount : 0));
  }, [recipes, query, filters, allergies, diets, k.pantry, portions]);

  const toggle = (f: Filter) =>
    setFilters((cur) => {
      const next = new Set(cur);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  if (error) return <T color={colors.brickText}>{error}</T>;
  if (!recipes) return <ActivityIndicator color={colors.walnut} style={{ marginTop: 24 }} />;

  return (
    <View style={{ gap: 12 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={`Search ${recipes.length} halal recipes or a cuisine`}
        placeholderTextColor="#9C8D84"
        accessibilityLabel="Search recipes"
        style={styles.search}
        returnKeyType="search"
      />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip label={allergies.length ? 'Safe for my family' : 'Fits my diet'} selected={filters.has('safe')} onPress={() => toggle('safe')} tone="sage" />
        <Chip label="30 min or less" selected={filters.has('quick')} onPress={() => toggle('quick')} />
        {k.pantry.length ? <Chip label="Cook with what I have" selected={filters.has('cook')} onPress={() => toggle('cook')} /> : null}
      </View>
      <T size={12.5} color={colors.muted}>
        {shown.length > limit ? `Showing ${limit} of ${shown.length} recipes` : `${shown.length} recipe${shown.length === 1 ? '' : 's'}`}
        {filters.has('safe') && allergies.length ? ` · without ${allergies.join(', ').toLowerCase()}` : ''}
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

const styles = StyleSheet.create({
  search: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.espresso },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 10 },
});
