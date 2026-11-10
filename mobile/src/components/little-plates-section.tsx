import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/kitchen-ui';
import { T } from '@/components/ui';
import { getLang, tr } from '@/lib/i18n';
import { loadLittleGuide, useLittleOnes } from '@/lib/little-plates';
import {
  LITTLE_STAGES,
  ageLabel,
  guideKey,
  littleChanges,
  type LittleAction,
  type LittleGuide,
  type LittleOne,
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

/** Names of the little ones at one stage: "Adam" or "Adam, Sara". */
const namesAt = (ones: LittleOne[], s: LittleStage) =>
  ones
    .filter((o) => o.stage === s)
    .map((o) => o.name)
    .join(', ');

/**
 * Which plate a recipe page shows: the family's (null) or a little one's stage.
 * With `open` the page starts on the youngest little one's plate (from Kitchen
 * or the meal plan).
 */
export function useLittlePlate(open = false) {
  const ones = useLittleOnes();
  const stages = useMemo(() => Array.from(new Set(ones.map((o) => o.stage).filter((s): s is LittleStage => !!s))), [ones]);
  const [plate, setPlate] = useState<LittleStage | null>(null);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (open && !opened && stages.length) {
      setPlate(stages[0]);
      setOpened(true);
    }
  }, [open, opened, stages]);
  return { ones, stages, plate: plate && stages.includes(plate) ? plate : null, setPlate };
}

/**
 * The switch under a recipe's title: "For the family | Adam's plate · 9 m".
 * On the family plate, one line says how many changes the little one needs.
 */
export function PlateSwitch({
  ones,
  stages,
  plate,
  onChange,
  ingredients,
}: {
  ones: LittleOne[];
  stages: LittleStage[];
  plate: LittleStage | null;
  onChange: (p: LittleStage | null) => void;
  ingredients: string[];
}) {
  if (!stages.length) return null;
  const first = stages[0];
  const youngest = ones.find((o) => o.stage === first)!;
  const changes = littleChanges(ingredients, first).filter((c) => c.action !== 'allergen');
  const tabs: { key: LittleStage | null; label: string }[] = [
    { key: null, label: tr('For the family') },
    ...stages.map((s) => {
      const kid = ones.find((o) => o.stage === s)!;
      return { key: s, label: tr('{0}’s plate · {1}', [namesAt(ones, s), ageLabel(kid.months)]) };
    }),
  ];
  return (
    <View style={{ marginTop: 14, gap: 10 }}>
      <View style={styles.switch} accessibilityRole="tablist">
        {tabs.map((t) => {
          const on = t.key === plate;
          return (
            <Pressable
              key={t.key ?? 'family'}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(t.key)}
              style={[styles.tab, on && (t.key ? styles.tabBaby : styles.tabFamily), !on && t.key ? styles.tabBabyOff : null]}
            >
              <T size={13.5} weight="bold" numberOfLines={1} color={on && t.key ? colors.linen : t.key ? colors.sageDark : colors.espresso}>
                {t.label}
              </T>
            </Pressable>
          );
        })}
      </View>
      {!plate ? (
        <Pressable accessibilityRole="button" onPress={() => onChange(first)} style={styles.hint}>
          <T size={13.5} color="#24402F" style={{ flex: 1, lineHeight: 19 }}>
            <T size={13.5} weight="bold" color="#24402F">
              {changes.length ? tr('{0} changes for {1}', [changes.length, youngest.name]) : tr('Ready for {0}', [youngest.name])}
            </T>
            {changes.length ? ` · ${tr(changes[0].text)}` : ` · ${tr('Just adjust the texture.')}`}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The little one's plate, shown in place of the family's ingredients and method:
 * the texture, what to do before cooking (fixed safety rules), and how to make
 * the plate (a saved guide written once per recipe and stage).
 */
export function LittlePlateView({
  stage,
  ones,
  id,
  name,
  ingredients,
  steps,
  allergies = [],
}: {
  stage: LittleStage;
  ones: LittleOne[];
  id?: string | null;
  name: string;
  ingredients: string[];
  steps: string[];
  allergies?: string[];
}) {
  const info = LITTLE_STAGES.find((s) => s.id === stage)!;
  const changes = useMemo(() => littleChanges(ingredients, stage, allergies), [ingredients, stage, allergies]);
  const [guide, setGuide] = useState<LittleGuide | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error' | 'limit'>('loading');
  const lang = getLang();
  const kids = ones.filter((o) => o.stage === stage);
  const onMilk = ones.filter((o) => !o.stage);

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
    <View style={{ marginTop: 14, gap: 18 }}>
      <T size={13.5} weight="semibold" color={colors.sageDark}>
        {tr('{0} · {1}', [tr(info.label), tr(info.texture).toLowerCase()])}
        {kids.length > 1 ? `\n${kids.map((k) => `${k.name} (${ageLabel(k.months)})`).join(', ')}` : ''}
      </T>

      <View style={{ gap: 8 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          {tr('BEFORE YOU COOK')}
        </T>
        {changes.length ? (
          changes.map((c, i) => (
            <View key={i} style={styles.change}>
              <Badge label={ACTION[c.action].label} tone={ACTION[c.action].tone} />
              <View style={{ flex: 1, gap: 2 }}>
                <T size={13} weight="bold">
                  {c.ingredient
                    .split(', ')
                    .map((x) => tr(x))
                    .join(', ')}
                </T>
                <T size={13.5} color="#4A3F39" style={{ lineHeight: 19 }}>
                  {tr(c.text)}
                </T>
              </View>
            </View>
          ))
        ) : (
          <T size={14} color={colors.muted}>
            {tr('No safety changes needed for this meal. Just adjust the texture.')}
          </T>
        )}
      </View>

      <View style={{ gap: 10 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          {kids.length === 1 ? tr('MAKE {0}’S PLATE', [kids[0].name.toUpperCase()]) : tr('MAKE THEIR PLATE')}
        </T>
        {state === 'loading' ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ActivityIndicator color={colors.sage} />
            <T size={13.5} color={colors.sageDark}>
              {tr('Preparing the little one’s version…')}
            </T>
          </View>
        ) : guide ? (
          <>
            {guide.steps.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.no}>
                  <T size={13} weight="bold" color={colors.sageDark}>
                    {i + 1}
                  </T>
                </View>
                <T size={15} style={{ flex: 1, lineHeight: 22 }}>
                  {s}
                </T>
              </View>
            ))}
            {guide.serve ? (
              <T size={14} color="#24402F" style={{ lineHeight: 20 }}>
                <T size={14} weight="bold" color="#24402F">
                  {tr('Serve: ')}
                </T>
                {guide.serve}
              </T>
            ) : null}
            {guide.portion ? (
              <T size={14} color="#24402F">
                <T size={14} weight="bold" color="#24402F">
                  {tr('Portion: ')}
                </T>
                {guide.portion}
              </T>
            ) : null}
          </>
        ) : (
          <T size={13.5} color={colors.sageDark}>
            {state === 'limit'
              ? tr('You’ve opened many new Little Plates today. Try again tomorrow; the safety changes above still apply.')
              : tr('The steps couldn’t load just now. The safety changes above still apply.')}
          </T>
        )}
      </View>

      {onMilk.length ? (
        <T size={13} color={colors.muted}>
          {tr('{0} is under 6 months: milk only for now. Solid food usually starts at around 6 months.', [onMilk.map((b) => b.name).join(', ')])}
        </T>
      ) : null}
      <T size={12} color={colors.muted} style={{ lineHeight: 17 }}>
        {tr('General guidance, not medical advice. Ask your doctor or health visitor about allergies and new foods.')}
      </T>
    </View>
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

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', backgroundColor: colors.tint, borderRadius: 18, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 6 },
  tabFamily: { backgroundColor: colors.card },
  tabBaby: { backgroundColor: colors.sageDark },
  tabBabyOff: { backgroundColor: colors.sageTint },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.sageTint, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  change: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  no: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sageTint, alignItems: 'center', justifyContent: 'center' },
});
