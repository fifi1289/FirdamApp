import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanView } from '@/components/kitchen-plan';
import { RecipesView } from '@/components/kitchen-recipes';
import { ShoppingView } from '@/components/kitchen-shopping';
import { PantryView } from '@/components/kitchen-pantry';
import { Badge } from '@/components/kitchen-ui';
import { HomeButton } from '@/components/screen';
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

/** The departments arriving with partner stores. */
function MoreDepartments() {
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
});
