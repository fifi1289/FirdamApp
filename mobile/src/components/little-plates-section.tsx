import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/kitchen-ui';
import { Card, T } from '@/components/ui';
import { getLang, tr } from '@/lib/i18n';
import { loadLittleGuide, useLittleOnes } from '@/lib/little-plates';
import {
  LITTLE_STAGES,
  ageLabel,
  guideKey,
  littleChanges,
  type LittleAction,
  type LittleGuide,
  type LittleStage,
} from '@/shared/little-plates-core';
import { colors } from '@/theme';

const ACTION: Record<LittleAction, { label: string; tone: 'brick' | 'amber' | 'sage' | 'walnut' }> = {
  'leave out': { label: 'Leave out', tone: 'brick' },
  'set aside first': { label: 'Set aside first', tone: 'amber' },
  cut: { label: 'Cut', tone: 'amber' },
  'cook through': { label: 'Cook through', tone: 'amber' },
  remove: { label: 'Remove', tone: 'walnut' },
  less: { label: 'Use less', tone: 'walnut' },
  allergen: { label: 'Allergen', tone: 'sage' },
};

/**
 * Little Plates on a recipe or meal: the baby or toddler version of this meal
 * for each little one in the family. Only shown when the family has a child
 * under 4. The safety changes are fixed rules; the steps come from a saved guide.
 */
export function LittlePlatesSection({
  id,
  name,
  ingredients,
  steps,
  allergies = [],
}: {
  id?: string | null;
  name: string;
  ingredients: string[];
  steps: string[];
  allergies?: string[];
}) {
  const ones = useLittleOnes();
  const stages = useMemo(() => [...new Set(ones.map((o) => o.stage).filter((s): s is LittleStage => !!s))], [ones]);
  const [stage, setStage] = useState<LittleStage | null>(null);
  const active = stage && stages.includes(stage) ? stage : (stages[0] ?? null);
  const babiesOnMilk = ones.filter((o) => !o.stage);
  if (!ones.length) return null;

  return (
    <View style={{ marginTop: 24, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <T weight="bold" size={17}>
          {tr('Little Plates')}
        </T>
        <T size={12.5} color={colors.muted}>
          {tr('Baby and toddler version')}
        </T>
      </View>

      {stages.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {stages.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="tab"
              accessibilityState={{ selected: s === active }}
              onPress={() => setStage(s)}
              style={[styles.tab, s === active && styles.tabOn]}
            >
              <T size={13} weight="bold" color={s === active ? colors.linen : colors.espresso}>
                {ones
                  .filter((o) => o.stage === s)
                  .map((o) => o.name)
                  .join(', ')}
              </T>
            </Pressable>
          ))}
        </View>
      ) : null}

      {active ? <StageCard key={active} stage={active} id={id} name={name} ingredients={ingredients} steps={steps} allergies={allergies} names={ones.filter((o) => o.stage === active)} /> : null}

      {babiesOnMilk.length ? (
        <T size={13} color={colors.muted}>
          {tr('{0} is under 6 months: milk only for now. Solid food usually starts at around 6 months.', [babiesOnMilk.map((b) => b.name).join(', ')])}
        </T>
      ) : null}
    </View>
  );
}

function StageCard({
  stage,
  id,
  name,
  ingredients,
  steps,
  allergies,
  names,
}: {
  stage: LittleStage;
  id?: string | null;
  name: string;
  ingredients: string[];
  steps: string[];
  allergies: string[];
  names: { name: string; months: number }[];
}) {
  const info = LITTLE_STAGES.find((s) => s.id === stage)!;
  const changes = useMemo(() => littleChanges(ingredients, stage, allergies), [ingredients, stage, allergies]);
  const [guide, setGuide] = useState<LittleGuide | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error' | 'limit'>('loading');
  const lang = getLang();

  useEffect(() => {
    let alive = true;
    setState('loading');
    loadLittleGuide({ key: guideKey(id, name), name, ingredients, steps, stage })
      .then((g) => {
        if (!alive) return;
        setGuide(g[lang] ?? g.en ?? null);
        setState('done');
      })
      .catch((e: Error) => alive && setState(e.message === 'limit' ? 'limit' : 'error'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, name, stage, lang]);

  return (
    <Card style={{ gap: 12, backgroundColor: colors.sageTint, borderColor: '#CFE0C6' }}>
      <View style={{ gap: 2 }}>
        <T size={12.5} weight="bold" color={colors.sageDark} style={{ letterSpacing: 0.4 }}>
          {tr('{0} · {1}', [tr(info.label).toUpperCase(), tr(info.ages)])}
        </T>
        <T size={15} weight="bold" color="#24402F">
          {names.map((n) => `${n.name} (${ageLabel(n.months)})`).join(', ')}
        </T>
        <T size={13} color={colors.sageDark}>
          {tr(info.texture)}
        </T>
      </View>

      {changes.length ? (
        <View style={{ gap: 8 }}>
          <T size={12} weight="bold" color={colors.sageDark} style={{ letterSpacing: 0.4 }}>
            {tr('SAFETY CHANGES')}
          </T>
          {changes.map((c, i) => (
            <View key={i} style={styles.change}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge label={ACTION[c.action].label} tone={ACTION[c.action].tone} />
                <T size={13} weight="bold" style={{ flexShrink: 1 }}>
                  {c.ingredient
                    .split(', ')
                    .map((x) => tr(x))
                    .join(', ')}
                </T>
              </View>
              <T size={13} color="#3F4A42" style={{ lineHeight: 18 }}>
                {tr(c.text)}
              </T>
            </View>
          ))}
        </View>
      ) : (
        <T size={13} color={colors.sageDark}>
          {tr('No safety changes needed for this meal. Just adjust the texture.')}
        </T>
      )}

      <View style={{ gap: 8 }}>
        <T size={12} weight="bold" color={colors.sageDark} style={{ letterSpacing: 0.4 }}>
          {tr('HOW TO MAKE IT')}
        </T>
        {state === 'loading' ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ActivityIndicator color={colors.sage} />
            <T size={13} color={colors.sageDark}>
              {tr('Preparing the little one’s version…')}
            </T>
          </View>
        ) : guide ? (
          <>
            {guide.steps.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={styles.no}>
                  <T size={12} weight="bold" color={colors.sageDark}>
                    {i + 1}
                  </T>
                </View>
                <T size={14} style={{ flex: 1, lineHeight: 20 }}>
                  {s}
                </T>
              </View>
            ))}
            {guide.serve ? (
              <T size={13.5} color="#24402F">
                <T size={13.5} weight="bold" color="#24402F">
                  {tr('Serve: ')}
                </T>
                {guide.serve}
              </T>
            ) : null}
            {guide.portion ? (
              <T size={13.5} color="#24402F">
                <T size={13.5} weight="bold" color="#24402F">
                  {tr('Portion: ')}
                </T>
                {guide.portion}
              </T>
            ) : null}
          </>
        ) : (
          <T size={13} color={colors.sageDark}>
            {state === 'limit' ? tr('You’ve opened many new Little Plates today. Try again tomorrow; the safety changes above still apply.') : tr('The steps couldn’t load just now. The safety changes above still apply.')}
          </T>
        )}
      </View>

      <T size={11.5} color="#4F5E54" style={{ lineHeight: 16 }}>
        {tr('General guidance, not medical advice. Ask your doctor or health visitor about allergies and new foods.')}
      </T>
    </Card>
  );
}

/** One line for the meal plan: "Little Plates · 2 changes for Adam". */
export function LittlePlatesHint({ ingredients, onPress }: { ingredients: string[]; onPress?: () => void }) {
  const ones = useLittleOnes();
  const youngest = ones.find((o) => o.stage);
  if (!youngest?.stage) return null;
  const n = littleChanges(ingredients, youngest.stage).filter((c) => c.action !== 'allergen').length;
  const label = n ? tr('Little Plates · {0} changes for {1}', [n, youngest.name]) : tr('Little Plates · ready for {0}', [youngest.name]);
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6}>
      <T size={12} weight="bold" color={colors.sageDark}>
        {label}
      </T>
    </Pressable>
  ) : (
    <T size={12} weight="bold" color={colors.sageDark}>
      {label}
    </T>
  );
}

export const openFamily = () => router.push('/family');

const styles = StyleSheet.create({
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.sand },
  tabOn: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  change: { gap: 4, backgroundColor: colors.card, borderRadius: 12, padding: 10 },
  no: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
