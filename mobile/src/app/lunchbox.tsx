import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Chip, Photo, Segmented } from '@/components/kitchen-ui';
import { HomeButton } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { getCurrency } from '@/lib/finance';
import { getLang, locale, tr } from '@/lib/i18n';
import { formatDateISO, getStartOfWeek, loadChoices } from '@/lib/kitchen';
import { useKitchen } from '@/lib/kitchen-store';
import { loadFamilyChildren, loadLunchboxPlan, makeLunchboxPlan, saveLunchboxChoices } from '@/lib/lunchbox';
import {
  LUNCHBOX_DAY_NAMES,
  LUNCHBOX_MIN_AGE,
  childrenFromFamily,
  chooseOption,
  dinnersFromPlan,
  optionView,
  pickedCount,
  toolLinks,
  type LunchboxChild,
  type LunchboxIdea,
  type LunchboxPlan,
} from '@/shared/lunchbox-core';
import { AFFILIATE_NOTE, amazonIsAffiliate } from '@/shared/shop-links';
import { colors } from '@/theme';

type Week = 'this' | 'next';

/**
 * School lunchboxes: a week (Monday to Friday) with 3 options a day, so the
 * child picks. Never nuts, always halal, the children's allergies avoided,
 * safe for little ones. The same as on firdam.com.
 */
export default function Lunchbox() {
  const k = useKitchen();
  const lang = getLang();
  // On Saturday and Sunday, plan next week.
  const [week, setWeek] = useState<Week>(() => ([0, 6].includes(new Date().getDay()) ? 'next' : 'this'));
  const weekStart = useMemo(() => {
    const d = getStartOfWeek();
    if (week === 'next') d.setDate(d.getDate() + 7);
    return formatDateISO(d);
  }, [week]);

  const [plan, setPlan] = useState<LunchboxPlan | null>(null);
  const [ideas, setIdeas] = useState<LunchboxIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [allergyChoices, setAllergyChoices] = useState<string[]>([]);
  const [family, setFamily] = useState<{ name: string; age: number | null; tooYoung: boolean }[]>([]);
  const [children, setChildren] = useState<(LunchboxChild & { on: boolean })[]>([]);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [day, setDay] = useState(0);

  useEffect(() => {
    getCurrency().then(setCurrency).catch(() => {});
    loadChoices().then((c) => setAllergyChoices(c.allergies)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);
    try {
      const [saved, members] = await Promise.all([loadLunchboxPlan(weekStart), loadFamilyChildren()]);
      const fam = childrenFromFamily(members);
      setFamily(fam);
      setPlan(saved?.plan ?? null);
      setIdeas(saved?.ideas ?? []);
      const fromFamily = fam.filter((c) => !c.tooYoung).map((c) => ({ name: c.name, age: c.age, allergies: [] as string[], on: true }));
      // Keep each child's extra allergies from the last plan.
      const last = saved?.plan.children ?? [];
      const merged = fromFamily.map((c) => ({ ...c, allergies: last.find((l) => l.name === c.name)?.allergies ?? [] }));
      const extra = last.filter((l) => !merged.some((m) => m.name === l.name)).map((l) => ({ ...l, on: true }));
      setChildren([...merged, ...extra]);
      setEditing(!saved);
      const today = new Date().getDay();
      setDay(week === 'this' && today >= 1 && today <= 5 ? today - 1 : 0);
    } catch {
      setProblem(tr('Lunchboxes could not be loaded. Pull to try again.'));
    } finally {
      setLoading(false);
    }
  }, [weekStart, week]);

  useEffect(() => {
    load();
  }, [load]);

  const household = k.prefs?.allergies ?? [];
  const mealPlan = week === 'next' ? k.nextWeek?.plan : k.week?.plan;
  const babies = family.filter((c) => c.tooYoung);
  const picked = children.filter((c) => c.on);

  const generate = async () => {
    if (!picked.length) return setProblem(tr('Choose at least one child.'));
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const res = await makeLunchboxPlan({
        weekStart,
        children: picked.map(({ name, age, allergies }) => ({ name, age, allergies })),
        allergies: household,
        leftovers: dinnersFromPlan(mealPlan),
      });
      setPlan(res.plan);
      setIdeas(res.ideas);
      setEditing(false);
      if (res.aiNote === 'limit') setNote(tr('Some lunchboxes repeat this week because new AI ideas for these allergies are used up this month.'));
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const choose = (date: string, index: number) => {
    if (!plan) return;
    const current = plan.days.find((d) => d.date === date)?.chosen;
    const next = chooseOption(plan, date, current === index ? null : index);
    setPlan(next);
    saveLunchboxChoices(next).catch(() => {});
  };

  const addChild = () => {
    const name = newName.trim();
    const age = Number(newAge);
    if (!name) return setProblem(tr('Enter the child’s name.'));
    if (!Number.isFinite(age) || age < LUNCHBOX_MIN_AGE || age > 17) return setProblem(tr('Enter an age from 2 to 17.'));
    setChildren((c) => [...c, { name, age: Math.floor(age), allergies: [], on: true }]);
    setNewName('');
    setNewAge('');
    setProblem(null);
  };

  const current = plan?.days[day];
  const dateLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('School lunchboxes')}
        </T>
        <T size={14.5} color={colors.muted}>
          {tr('3 lunchbox ideas a day, so your child picks. Always nut-free and halal, with no sweets, and safe for little ones.')}
        </T>

        <Segmented<Week>
          options={[
            { key: 'this', label: tr('This week') },
            { key: 'next', label: tr('Next week') },
          ]}
          value={week}
          onChange={setWeek}
        />

        {loading ? (
          <ActivityIndicator color={colors.walnut} style={{ marginTop: 24 }} />
        ) : (
          <>
            {babies.length ? (
              <Card style={{ backgroundColor: colors.amberTint, gap: 4 }}>
                <T size={14} weight="bold" color={colors.amberText}>
                  {tr('Little Plates is coming soon')}
                </T>
                <T size={13.5} color={colors.amberText}>
                  {tr('{0} is under 2, so lunchboxes are not for them yet. Baby and toddler versions of your family meals are coming soon.', [babies.map((b) => b.name).join(', ')])}
                </T>
              </Card>
            ) : null}

            {editing || !plan ? (
              <Card style={{ gap: 12 }}>
                <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
                  {tr('WHO NEEDS A LUNCHBOX?')}
                </T>
                {children.length === 0 ? (
                  <T size={14} color={colors.muted}>
                    {tr('Add your children here, or in Family with their birth date.')}
                  </T>
                ) : null}
                {children.map((c, i) => (
                  <View key={`${c.name}-${i}`} style={styles.child}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: c.on }}
                      onPress={() => setChildren((all) => all.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <View style={[styles.box, c.on && styles.boxOn]}>{c.on ? <T size={13} weight="bold" color={colors.linen}>✓</T> : null}</View>
                      <T size={15.5} weight="bold">
                        {c.name}
                        {c.age !== null ? <T size={14} color={colors.muted}>{`  ·  ${tr('{0} years', [c.age])}`}</T> : null}
                      </T>
                    </Pressable>
                    {c.on && allergyChoices.length ? (
                      <View style={{ gap: 6 }}>
                        <T size={12.5} color={colors.muted}>
                          {tr('Allergies for {0} (nuts are always left out)', [c.name])}
                        </T>
                        <View style={styles.wrap}>
                          {allergyChoices
                            .filter((a) => a !== 'Peanuts' && a !== 'Tree nuts')
                            .map((a) => (
                              <Chip
                                key={a}
                                label={a}
                                selected={c.allergies.includes(a) || household.includes(a)}
                                onPress={
                                  household.includes(a)
                                    ? undefined
                                    : () =>
                                        setChildren((all) =>
                                          all.map((x, j) =>
                                            j === i ? { ...x, allergies: x.allergies.includes(a) ? x.allergies.filter((y) => y !== a) : [...x.allergies, a] } : x
                                          )
                                        )
                                }
                              />
                            ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder={tr('Child’s name')}
                    placeholderTextColor={colors.muted}
                    style={[styles.input, { flex: 2 }]}
                    accessibilityLabel={tr('Child’s name')}
                  />
                  <TextInput
                    value={newAge}
                    onChangeText={setNewAge}
                    placeholder={tr('Age')}
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    style={[styles.input, { flex: 1 }]}
                    accessibilityLabel={tr('Age')}
                  />
                  <Button label={tr('Add')} variant="secondary" onPress={addChild} style={{ height: 48, paddingHorizontal: 14 }} />
                </View>
                {household.length ? (
                  <T size={12.5} color={colors.muted}>
                    {tr('Family allergies from your meal preferences are always avoided: {0}.', [household.map((a) => tr(a)).join(', ')])}
                  </T>
                ) : null}
                {mealPlan ? (
                  <T size={12.5} color={colors.muted}>
                    {tr('Last night’s dinner from your meal plan becomes a leftover option when it’s safe.')}
                  </T>
                ) : null}
                <Button label={busy ? tr('Planning…') : plan ? tr('Plan new lunchboxes') : tr('Plan this week’s lunchboxes')} onPress={generate} disabled={busy} />
                {plan ? <Button label={tr('Cancel')} variant="secondary" onPress={() => setEditing(false)} /> : null}
              </Card>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <T size={13.5} color={colors.muted} style={{ flex: 1 }}>
                    {tr('For {0} · {1} of 5 days picked', [plan.children.map((c) => c.name).join(', '), pickedCount(plan)])}
                  </T>
                  <Button label={tr('Change')} variant="secondary" onPress={() => setEditing(true)} style={{ height: 38, paddingHorizontal: 14 }} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {plan.days.map((d, i) => (
                    <Pressable
                      key={d.date}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: i === day }}
                      onPress={() => setDay(i)}
                      style={[styles.dayTab, i === day && styles.dayTabOn]}
                    >
                      <T size={13} weight="bold" color={i === day ? colors.linen : colors.espresso}>
                        {tr(LUNCHBOX_DAY_NAMES[i] ?? '')}
                      </T>
                      <T size={11.5} color={i === day ? colors.goldText : colors.muted}>
                        {d.chosen !== null ? '✓ ' : ''}
                        {dateLabel(d.date)}
                      </T>
                    </Pressable>
                  ))}
                </ScrollView>

                {current ? (
                  <View style={{ gap: 12 }}>
                    <T size={13.5} color={colors.muted}>
                      {current.chosen === null ? tr('Show these to your child and let them pick one.') : tr('Picked! Tap it again to change.')}
                    </T>
                    {current.options.map((o, i) => {
                      const v = optionView(o, ideas, lang);
                      if (!v) return null;
                      const chosen = current.chosen === i;
                      const links = toolLinks(v, currency);
                      return (
                        <Card key={v.key} style={[{ gap: 10, padding: 12 }, chosen && styles.chosen]}>
                          {v.image ? <Photo uri={v.image} height={170} /> : <View style={styles.noPhoto}><T size={40}>{v.leftover ? '🥡' : '🍱'}</T></View>}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <T size={17} weight="extrabold" style={{ flexShrink: 1 }}>
                              {v.name}
                            </T>
                            {v.leftover ? <Badge label="Leftovers" tone="sage" /> : null}
                            {chosen ? <Badge label="Picked" tone="walnut" /> : null}
                          </View>
                          <View style={{ gap: 3 }}>
                            {v.items.map((it) => (
                              <T key={it} size={14}>
                                {`•  ${it}`}
                              </T>
                            ))}
                          </View>
                          <View style={styles.tip}>
                            <T size={13.5} color={colors.sageDark}>
                              {`✨ ${v.fun_tip}`}
                            </T>
                          </View>
                          {links.length ? (
                            <View style={{ gap: 6 }}>
                              <T size={12} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.3 }}>
                                {tr('TO MAKE IT')}
                              </T>
                              <View style={styles.wrap}>
                                {links.map((l) => (
                                  <Chip key={l.url} label={`${l.label} ↗`} onPress={() => Linking.openURL(l.url)} />
                                ))}
                              </View>
                            </View>
                          ) : null}
                          <Button label={chosen ? tr('Picked ✓') : tr('Pick this one')} variant={chosen ? 'secondary' : 'primary'} onPress={() => choose(current.date, i)} />
                        </Card>
                      );
                    })}
                  </View>
                ) : null}
                <T size={12} color={colors.muted} style={{ lineHeight: 17 }}>
                  {tr('Pack with an ice pack and check every label for allergens.')}
                  {amazonIsAffiliate(currency) ? ` ${tr(AFFILIATE_NOTE)}` : ''}
                </T>
              </>
            )}
            {note ? (
              <T size={13} color={colors.amberText}>
                {note}
              </T>
            ) : null}
            {problem ? (
              <T size={13.5} color={colors.brickText}>
                {problem}
              </T>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  child: { gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.walnut, borderColor: colors.walnut },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 12, fontSize: 15, color: colors.espresso },
  dayTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', minWidth: 84 },
  dayTabOn: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  chosen: { borderWidth: 2, borderColor: colors.walnut },
  noPhoto: { height: 120, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  tip: { backgroundColor: colors.sageTint, borderRadius: 10, padding: 10 },
});
