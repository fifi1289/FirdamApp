import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import { loadChoices, savePreferences, type MealPreferencesState } from '@/lib/kitchen';
import { patchKitchen, useKitchen } from '@/lib/kitchen-store';
import { MEAL_TYPES } from '@/shared/meals-config';
import { colors } from '@/theme';

function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function MealPreferences() {
  const k = useKitchen();
  const [prefs, setPrefs] = useState<MealPreferencesState | null>(k.prefs);
  const [choices, setChoices] = useState<{ allergies: string[]; diets: string[] }>({ allergies: [], diets: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prefs && k.prefs) setPrefs(k.prefs);
  }, [k.prefs, prefs]);
  useEffect(() => {
    loadChoices().then(setChoices).catch(() => {});
  }, []);

  if (!prefs) return null;

  const save = async () => {
    if (!prefs.mealTypes.length) {
      Alert.alert('Choose at least one meal to plan.');
      return;
    }
    setSaving(true);
    try {
      await savePreferences(prefs);
      patchKitchen({ prefs });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <T weight="extrabold" size={22} accessibilityRole="header">
          Meal preferences
        </T>
        <Button label="Cancel" variant="text" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}>
        <View style={{ gap: 10 }}>
          <T weight="bold" size={16}>
            Allergies in your home
          </T>
          <T size={13.5} color={colors.muted}>
            Recipes with these are never planned or shown as safe.
          </T>
          <View style={styles.wrap}>
            {choices.allergies.map((a) => (
              <Chip key={a} label={a} selected={prefs.allergies.includes(a)} onPress={() => setPrefs({ ...prefs, allergies: toggleIn(prefs.allergies, a) })} tone="sage" />
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <T weight="bold" size={16}>
            Diets
          </T>
          <View style={styles.wrap}>
            {choices.diets.map((d) => (
              <Chip key={d} label={d} selected={prefs.dietaryPreferences.includes(d)} onPress={() => setPrefs({ ...prefs, dietaryPreferences: toggleIn(prefs.dietaryPreferences, d) })} />
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <T weight="bold" size={16}>
            Meals to plan
          </T>
          <View style={styles.wrap}>
            {MEAL_TYPES.map((m) => (
              <Chip key={m.key} label={m.label} selected={prefs.mealTypes.includes(m.key)} onPress={() => setPrefs({ ...prefs, mealTypes: toggleIn(prefs.mealTypes, m.key) })} />
            ))}
          </View>
        </View>

        <Card>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: prefs.usePantryFirst }} onPress={() => setPrefs({ ...prefs, usePantryFirst: !prefs.usePantryFirst })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T weight="bold">Use my pantry first</T>
              <T size={13} color={colors.muted}>
                Plans favour meals you can make with what you already have.
              </T>
            </View>
            <Switch value={prefs.usePantryFirst} onValueChange={(v) => setPrefs({ ...prefs, usePantryFirst: v })} trackColor={{ true: colors.sage, false: colors.sand }} />
          </Pressable>
        </Card>

        <Button label="Save" onPress={save} busy={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
