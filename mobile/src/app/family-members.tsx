import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/kitchen-ui';
import { Button, Card, Field, T } from '@/components/ui';
import { loadHousehold } from '@/lib/kitchen';
import { patchKitchen } from '@/lib/kitchen-store';
import { supabase } from '@/lib/supabase';
import { formatPortions, portionFor } from '@/shared/pantry-portions';
import { colors } from '@/theme';
import { showAlert } from '@/components/firdam-alert';
import { tr } from '@/lib/i18n';

// How much each person eats. "Auto" works it out from their age.
const PORTIONS: { label: string; value: number | null }[] = [
  { label: 'Auto (from age)', value: null },
  { label: 'Small · ½', value: 0.5 },
  { label: 'Child · ¾', value: 0.75 },
  { label: 'Adult · 1', value: 1 },
  { label: 'Big eater · 1½', value: 1.5 },
  { label: 'Double · 2', value: 2 },
];

const RELATIONSHIPS = ['Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];

interface Member {
  id: string;
  first_name: string;
  relationship: string;
  birth_date: string | null;
  portion: number | null;
}

type Draft = { id: string | null; first_name: string; relationship: string; birth_date: string; portion: number | null };

const EMPTY: Draft = { id: null, first_name: '', relationship: 'Son', birth_date: '', portion: null };

function age(birth: string | null): string {
  if (!birth) return '';
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return '';
  const years = Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years < 1 ? tr('under 1') : tr('{0} yrs', [years]);
}

/** Add, edit and remove family members — the same list the website uses. */
export default function FamilyMembers() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('family_members').select('id, first_name, relationship, birth_date, portion').order('created_at', { ascending: true });
    if (error) showAlert(tr('Could not load your family'), error.message);
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
    if (!name) return showAlert(tr('Add a name'));
    const birth = draft.birth_date.trim();
    if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return showAlert(tr('Birth date'), tr('Use the format YYYY-MM-DD, for example 2018-04-21.'));
    setSaving(true);
    const payload = { first_name: name, relationship: draft.relationship, birth_date: birth || null, portion: draft.portion };
    const { error } = draft.id
      ? await supabase.from('family_members').update(payload).eq('id', draft.id)
      : await supabase.from('family_members').insert(payload);
    setSaving(false);
    if (error) return showAlert(tr('Could not save'), error.message);
    setDraft(null);
    await Promise.all([load(), refreshHousehold()]);
  };

  const remove = (m: Member) =>
    showAlert(tr('Remove {0}?', [m.first_name]), tr('Meal plans will cook for one person less.'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('family_members').delete().eq('id', m.id);
          if (error) return showAlert(tr('Could not remove'), error.message);
          setDraft(null);
          await Promise.all([load(), refreshHousehold()]);
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <T weight="extrabold" size={22} accessibilityRole="header">
          {tr('Family members')}
        </T>
        <Button label={tr('Done')} variant="text" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        <T size={14} color={colors.muted}>
          {tr('Meal plans and shopping amounts are sized for everyone here. Children count as smaller portions.')}
        </T>

        {!members ? (
          <ActivityIndicator color={colors.walnut} />
        ) : (
          members.map((m) =>
            draft?.id === m.id ? null : (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityHint={tr('Edit this family member')}
                onPress={() => setDraft({ id: m.id, first_name: m.first_name, relationship: m.relationship, birth_date: m.birth_date ?? '', portion: m.portion })}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <T weight="bold">{m.first_name}</T>
                  <T size={13} color={colors.muted}>
                    {[m.relationship, age(m.birth_date), tr('eats {0} portion', [formatPortions(portionFor(m))])].filter(Boolean).join(' · ')}
                  </T>
                </View>
                <T size={13} weight="semibold" color={colors.walnut}>
                  {tr('Edit')}
                </T>
              </Pressable>
            ),
          )
        )}

        {draft ? (
          <Card style={{ gap: 12 }}>
            <Field label={tr('First name')} value={draft.first_name} onChangeText={(t) => setDraft({ ...draft, first_name: t })} autoFocus={!draft.id} />
            <T weight="semibold" size={14}>
              {tr('Relationship')}
            </T>
            <View style={styles.wrap}>
              {RELATIONSHIPS.map((r) => (
                <Chip key={r} label={r} selected={draft.relationship === r} onPress={() => setDraft({ ...draft, relationship: r })} />
              ))}
            </View>
            <Field
              label={tr('Birth date (optional, YYYY-MM-DD)')}
              value={draft.birth_date}
              onChangeText={(t) => setDraft({ ...draft, birth_date: t })}
              placeholder="2018-04-21"
              keyboardType="numbers-and-punctuation"
            />
            <T weight="semibold" size={14}>
              {tr('Portion')}
            </T>
            <View style={styles.wrap}>
              {PORTIONS.map((p) => (
                <Chip key={p.label} label={tr(p.label)} selected={draft.portion === p.value} onPress={() => setDraft({ ...draft, portion: p.value })} />
              ))}
            </View>
            <Button label={draft.id ? tr('Save changes') : tr('Add to family')} onPress={save} busy={saving} />
            {draft.id ? <Button label={tr('Remove from family')} variant="text" onPress={() => remove(members!.find((m) => m.id === draft.id)!)} /> : null}
            <Button label={tr('Cancel')} variant="secondary" onPress={() => setDraft(null)} />
          </Card>
        ) : (
          <Button label={tr('Add a family member')} onPress={() => setDraft({ ...EMPTY })} />
        )}

        <Button label={tr('Allergies and food preferences')} variant="secondary" onPress={() => router.push('/meal-preferences')} />
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
