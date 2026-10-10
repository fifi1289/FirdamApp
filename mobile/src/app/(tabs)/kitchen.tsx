import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanView } from '@/components/kitchen-plan';
import { RecipesView } from '@/components/kitchen-recipes';
import { ShoppingView } from '@/components/kitchen-shopping';
import { Segmented } from '@/components/kitchen-ui';
import { ComingNext } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { useKitchen } from '@/lib/kitchen-store';
import { colors } from '@/theme';

type Section = 'plan' | 'recipes' | 'shopping' | 'pantry';

export default function Kitchen() {
  const k = useKitchen();
  const [section, setSection] = useState<Section>('plan');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await k.refresh();
    setRefreshing(false);
  };

  const openCount = k.items.filter((i) => !i.checked).length;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.walnut} />}
      >
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          Kitchen
        </T>
        <Segmented<Section>
          value={section}
          onChange={setSection}
          options={[
            { key: 'plan', label: 'Plan' },
            { key: 'recipes', label: 'Recipes' },
            { key: 'shopping', label: openCount ? `Shopping · ${openCount}` : 'Shopping' },
            { key: 'pantry', label: 'Pantry' },
          ]}
        />
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
          <ShoppingView />
        ) : (
          <ComingNext step={5} title="Smart pantry" text="Scan a receipt, keep track of what you have, and see what to use first." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
});
