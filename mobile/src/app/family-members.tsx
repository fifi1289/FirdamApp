import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/kitchen-ui';
import { Button, Card, Field, T } from '@/components/ui';
import { loadHousehold } from '@/lib/kitchen';
import { patchKitchen } from '@/lib/kitchen-store';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

const RELATIONSHIPS = ['Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];

interface Member {
  id: string;
  first_name: string;
  relationship: string;
  birth_date: string | null;
}

type Draft = { id: string | null; first_name: string; relationship: string; birth_date: string };

const EMPTY: Draft = { id: null, first_name: '', relationship: 'Son', birth_date: '' };

function age(birth: string | null): string {
  if (!birth) return '';
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return '';
  const years = Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years < 1 ? 'under 1' : `${years} yrs`;
}

/** Add, edit and remove family members — the same list the website uses. */
export default function FamilyMembers() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('family_members').select('id, first_name, relationship, birth_date').order('created_at', { ascending: true });
    if (error) Alert.alert('Could not load your family', error.message);
    setMembers((data ?? []) as Member[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Portions for meal plans come from the members' ages.
  const refreshHousehold = async () => patchKitchen({ household: await loadHousehold() });

  const save = async () => {
    if (!draft) return;
    const name = draft.first_name.trim();
    if (!name) return Alert.alert('Add a name');
    const birth = draft.birth_date.trim();
    if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return Alert.alert('Birth date', 'Use the format YYYY-MM-DD, for example 2018-04-21.');
    setSaving(true);
    const payload = { first_name: name, relationship: draft.relationship, birth_date: birth || null };
    const { error } = draft.id
      ? await supabase.from('family_members').update(payload).eq('id', draft.id)
      : await supabase.from('family_members').insert(payload);
    setSaving(false);
    if (error) return Alert.alert('Could not save', error.message);
    setDraft(null);
    await Promise.all([load(), refreshHousehold()]);
  };

  const remove = (m: Member) =>
    Alert.alert(`Remove ${m.first_name}?`, 'Meal plans will cook for one person less.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('family_members').delete().eq('id', m.id);
          if (error) return Alert.alert('Could not remove', error.message);
          setDraft(null);
          await Promise.all([load(), refreshHousehold()]);
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <T weight="extrabold" size={22} accessibilityRole="header">
          Family members
        </T>
        <Button label="Done" variant="text" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        <T size={14} color={colors.muted}>
          Meal plans and shopping amounts are sized for everyone here. Children count as smaller portions.
        </T>

        {!members ? (
          <ActivityIndicator color={colors.walnut} />
        ) : (
          members.map((m) =>
            draft?.id === m.id ? null : (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityHint="Edit this family member"
                onPress={() => setDraft({ id: m.id, first_name: m.first_name, relationship: m.relationship, birth_date: m.birth_date ?? '' })}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <T weight="bold">{m.first_name}</T>
                  <T size={13} color={colors.muted}>
                    {[m.relationship, age(m.birth_date)].filter(Boolean).join(' · ')}
                  </T>
                </View>
                <T size={13} weight="semibold" color={colors.walnut}>
                  Edit
                </T>
              </Pressable>
            ),
          )
        )}

        {draft ? (
          <Card style={{ gap: 12 }}>
            <Field label="First name" value={draft.first_name} onChangeText={(t) => setDraft({ ...draft, first_name: t })} autoFocus={!draft.id} />
            <T weight="semibold" size={14}>
              Relationship
            </T>
            <View style={styles.wrap}>
              {RELATIONSHIPS.map((r) => (
                <Chip key={r} label={r} selected={draft.relationship === r} onPress={() => setDraft({ ...draft, relationship: r })} />
              ))}
            </View>
            <Field
              label="Birth date (optional, YYYY-MM-DD)"
              value={draft.birth_date}
              onChangeText={(t) => setDraft({ ...draft, birth_date: t })}
              placeholder="2018-04-21"
              keyboardType="numbers-and-punctuation"
            />
            <Button label={draft.id ? 'Save changes' : 'Add to family'} onPress={save} busy={saving} />
            {draft.id ? <Button label="Remove from family" variant="text" onPress={() => remove(members!.find((m) => m.id === draft.id)!)} /> : null}
            <Button label="Cancel" variant="secondary" onPress={() => setDraft(null)} />
          </Card>
        ) : (
          <Button label="Add a family member" onPress={() => setDraft({ ...EMPTY })} />
        )}

        <Button label="Allergies and food preferences" variant="secondary" onPress={() => router.push('/meal-preferences')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
