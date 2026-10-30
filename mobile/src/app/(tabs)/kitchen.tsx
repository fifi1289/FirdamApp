import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanView } from '@/components/kitchen-plan';
import { RecipesView } from '@/components/kitchen-recipes';
import { ShoppingView } from '@/components/kitchen-shopping';
import { PantryView } from '@/components/kitchen-pantry';
import { Badge, Chip } from '@/components/kitchen-ui';
import { PartnerShops } from '@/components/partner-shops';
import { HomeButton } from '@/components/screen';
import { getCurrency } from '@/lib/finance';
import { AFFILIATE_NOTE, DEPARTMENT_PICKS, amazonSearchUrl, parseBudget, shopsAvailable } from '@/shared/shop-links';
import { SHOPPING_DEPARTMENTS } from '@/shared/shopping-departments';
import { Button, Card, T } from '@/components/ui';
import { useKitchen } from '@/lib/kitchen-store';
import { usePartnerShops } from '@/lib/partners';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

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
  // Shopping departments: Groceries by default, the others always one tap away at the top.
  const [dept, setDept] = useState('groceries');

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
          {tr(TITLES[section])}
        </T>
        {k.loading ? (
          <ActivityIndicator color={colors.walnut} style={{ marginTop: 32 }} />
        ) : k.error ? (
          <View style={{ gap: 12 }}>
            <T color={colors.brickText}>{k.error}</T>
            <Button label={tr('Try again')} variant="secondary" onPress={k.refresh} />
          </View>
        ) : section === 'plan' ? (
          <PlanView />
        ) : section === 'recipes' ? (
          <RecipesView />
        ) : section === 'shopping' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityLabel={tr('Shopping departments')}>
              {SHOPPING_DEPARTMENTS.map((d) => (
                <Chip key={d.id} label={tr(d.label)} selected={dept === d.id} onPress={() => setDept(d.id)} />
              ))}
            </ScrollView>
            {dept === 'groceries' ? (
              <>
                <T size={13.5} color={colors.muted}>
                  {tr('Fills itself from your meal plan, minus what’s in your pantry.')}
                </T>
                <ShoppingView />
              </>
            ) : (
              <DepartmentView dept={dept} />
            )}
          </>
        ) : (
          <PantryView />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * One shopping department (Household, Clothing…): partner shops first, then in
 * Canada an Amazon.ca search within a budget. Elsewhere, partners or "soon".
 */
function DepartmentView({ dept }: { dept: string }) {
  const [online, setOnline] = useState<boolean | null>(null);
  const partners = usePartnerShops();
  const [query, setQuery] = useState('');
  const [max, setMax] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    getCurrency()
      .then((c) => setOnline(shopsAvailable(c)))
      .catch(() => setOnline(false));
  }, []);
  useEffect(() => {
    setQuery('');
    setProblem(null);
  }, [dept]);
  const current = SHOPPING_DEPARTMENTS.find((d) => d.id === dept);
  if (online === null || !current) return null;
  const hasPartners = partners.some((s) => s.department === dept);

  const search = () => {
    if (!query.trim()) return setProblem(tr('Type what you’re looking for.'));
    if (max.trim() && parseBudget(max) == null) return setProblem(tr('Enter your budget as a number, for example 40.'));
    Linking.openURL(amazonSearchUrl(query, parseBudget(max)));
  };

  return (
    <>
      <T size={13.5} color={colors.muted}>
        {tr(current.note)}
      </T>

      <PartnerShops shops={partners} department={dept} />

      {online ? (
        <Card style={{ gap: 12 }}>
          <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
            {tr('SEARCH {0} ON AMAZON.CA', [current.label.toUpperCase()])}
          </T>
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setProblem(null);
            }}
            placeholder={tr('What are you looking for?')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={search}
            accessibilityLabel={tr('Search {0}', [current.label])}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={max}
              onChangeText={(v) => {
                setMax(v);
                setProblem(null);
              }}
              placeholder={tr('Max budget ($)')}
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1 }]}
              accessibilityLabel={tr('Maximum budget in Canadian dollars (optional)')}
            />
            <Button label={tr('Search')} onPress={search} style={{ height: 48, paddingHorizontal: 18 }} />
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
          <T size={12} color={colors.muted}>{tr('{0} Prices and availability are shown on Amazon.ca.', [AFFILIATE_NOTE])}</T>
        </Card>
      ) : !hasPartners ? (
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T weight="bold" size={15} style={{ flex: 1 }}>
              {tr('{0} is coming soon', [current.label])}
            </T>
            <Badge label={tr('Soon')} tone="amber" />
          </View>
          <T size={13.5} color={colors.muted}>
            {tr('With trusted Muslim-owned and partner stores, insha’Allah.')}
          </T>
        </Card>
      ) : null}

      <T size={13} color={colors.muted}>
        {tr('Run a Muslim-owned shop? ')}
        <T size={13} weight="bold" color={colors.walnut} accessibilityRole="link" onPress={() => Linking.openURL('https://firdam.com/partners')}>
          {tr('Become a Firdam partner ↗')}
        </T>
      </T>
    </>
  );
}

const styles = StyleSheet.create({
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.linen, paddingHorizontal: 14, fontSize: 15, color: colors.espresso },
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
});
