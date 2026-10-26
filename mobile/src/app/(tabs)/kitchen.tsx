import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanView } from '@/components/kitchen-plan';
import { RecipesView } from '@/components/kitchen-recipes';
import { ShoppingView } from '@/components/kitchen-shopping';
import { PantryView } from '@/components/kitchen-pantry';
import { Badge, Chip } from '@/components/kitchen-ui';
import { HomeButton } from '@/components/screen';
import { getCurrency } from '@/lib/finance';
import { AFFILIATE_NOTE, DEPARTMENT_PICKS, amazonSearchUrl, parseBudget, shopsAvailable } from '@/shared/shop-links';
import { UPCOMING_DEPARTMENTS } from '@/shared/shopping-departments';
import { Button, Card, T } from '@/components/ui';
import { useKitchen } from '@/lib/kitchen-store';
import { colors } from '@/theme';

type Section = 'plan' | 'recipes' | 'shopping' | 'pantry';

const TITLES: Record<Section, string> = { plan: 'Meal plan', recipes: 'Recipes', shopping: 'Shopping', pantry: 'Pantry' };

export default function Kitchen() {
  const k = useKitchen();
  // Each kitchen feature on the Home ring opens its own screen: /kitchen?section=shopping
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<Section>(
    params.section && ['plan', 'recipes', 'shopping', 'pantry'].includes(params.section) ? (params.section as Section) : 'plan'
  );
  useEffect(() => {
    if (params.section && ['plan', 'recipes', 'shopping', 'pantry'].includes(params.section)) setSection(params.section as Section);
  }, [params.section]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await k.refresh();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.walnut} />}
      >
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {TITLES[section]}
        </T>
        {k.loading ? (
          <ActivityIndicator color={colors.walnut} style={{ marginTop: 32 }} />
        ) : k.error ? (
          <View style={{ gap: 12 }}>
            <T color={colors.brickText}>{k.error}</T>
            <Button label="Try again" variant="secondary" onPress={k.refresh} />
          </View>
        ) : section === 'plan' ? (
          <PlanView />
        ) : section === 'recipes' ? (
          <RecipesView />
        ) : section === 'shopping' ? (
          <>
            <View style={{ gap: 2 }}>
              <T weight="extrabold" size={19}>
                Groceries
              </T>
              <T size={13.5} color={colors.muted}>
                Food and kitchen basics. Fills itself from your meal plan, minus what’s in your pantry.
              </T>
            </View>
            <ShoppingView />
            <MoreDepartments />
          </>
        ) : (
          <PantryView />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * More shopping beyond groceries. In Canada: search Amazon.ca by department,
 * within a budget, or tap a popular pick. Elsewhere: the departments to come.
 */
function MoreDepartments() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [dept, setDept] = useState(UPCOMING_DEPARTMENTS[0]!.id);
  const [query, setQuery] = useState('');
  const [max, setMax] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    getCurrency()
      .then((c) => setOnline(shopsAvailable(c)))
      .catch(() => setOnline(false));
  }, []);
  if (online === null) return null;

  if (!online) {
    return (
      <Card style={{ gap: 10 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          MORE SHOPPING SOON
        </T>
        {UPCOMING_DEPARTMENTS.map((d) => (
          <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T size={14.5} weight="semibold">
                {d.label}
              </T>
              <T size={12.5} color={colors.muted}>
                {d.note}
              </T>
            </View>
            <Badge label="Soon" tone="amber" />
          </View>
        ))}
        <T size={12.5} color={colors.muted}>
          With trusted Muslim-owned and partner stores.
        </T>
      </Card>
    );
  }

  const current = UPCOMING_DEPARTMENTS.find((d) => d.id === dept)!;
  const search = () => {
    if (!query.trim()) return setProblem('Type what you’re looking for.');
    if (max.trim() && parseBudget(max) == null) return setProblem('Enter your budget as a number, for example 40.');
    Linking.openURL(amazonSearchUrl(query, parseBudget(max)));
  };

  return (
    <Card style={{ gap: 12 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        MORE SHOPPING
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {UPCOMING_DEPARTMENTS.map((d) => (
          <Chip key={d.id} label={d.label} selected={dept === d.id} onPress={() => setDept(d.id)} />
        ))}
      </ScrollView>
      <T size={13} color={colors.muted}>{`${current.note}. Opens on Amazon.ca.`}</T>
      <TextInput
        value={query}
        onChangeText={(v) => {
          setQuery(v);
          setProblem(null);
        }}
        placeholder="What are you looking for?"
        placeholderTextColor={colors.muted}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={search}
        accessibilityLabel={`Search ${current.label}`}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={max}
          onChangeText={(v) => {
            setMax(v);
            setProblem(null);
          }}
          placeholder="Max budget ($)"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={[styles.input, { flex: 1 }]}
          accessibilityLabel="Maximum budget in Canadian dollars (optional)"
        />
        <Button label="Search" onPress={search} style={{ height: 48, paddingHorizontal: 18 }} />
      </View>
      {problem ? (
        <T size={13} color={colors.brickText}>
          {problem}
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(DEPARTMENT_PICKS[dept] ?? []).map((p) => (
          <Chip key={p.query} label={`${p.label} ↗`} onPress={() => Linking.openURL(amazonSearchUrl(p.query, parseBudget(max)))} />
        ))}
      </View>
      <T size={12} color={colors.muted}>{`${AFFILIATE_NOTE} Prices and availability are shown on Amazon.ca.`}</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.linen, paddingHorizontal: 14, fontSize: 15, color: colors.espresso },
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
});
