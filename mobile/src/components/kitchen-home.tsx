import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, StarPattern, type IconName } from '@/components/art';
import { openMeal } from '@/components/kitchen-plan';
import { Photo } from '@/components/kitchen-ui';
import { T } from '@/components/ui';
import { getLang, tr } from '@/lib/i18n';
import { formatDateISO, getStartOfWeek, mealImage, useFreshMealPhotos } from '@/lib/kitchen';
import { useKitchen } from '@/lib/kitchen-store';
import { loadLunchboxPlan } from '@/lib/lunchbox';
import { useLittleOnes } from '@/lib/little-plates';
import { ageLabel, littleChanges } from '@/shared/little-plates-core';
import { optionView, type LunchboxIdea, type LunchboxPlan } from '@/shared/lunchbox-core';
import { mealForNow, type MockMeal } from '@/shared/plan-core';
import { effectiveExpiry } from '@/shared/kitchen-items';
import { colors } from '@/theme';

type Section = 'plan' | 'recipes' | 'shopping' | 'pantry';

/** The next school day (Monday to Friday) after today, as YYYY-MM-DD, and the Monday of its week. */
function nextSchoolDay(now = new Date()): { date: string; weekStart: string; isTomorrow: boolean } {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  let steps = 0;
  do {
    d.setDate(d.getDate() + 1);
    steps++;
  } while (d.getDay() === 0 || d.getDay() === 6);
  return { date: formatDateISO(d), weekStart: formatDateISO(getStartOfWeek(d)), isTomorrow: steps === 1 };
}

/**
 * Kitchen's front page: tonight's dinner, the children's next lunchbox, and
 * Recipes, Shopping and Pantry one tap away. The same as firdam.com/dashboard/kitchen.
 */
export function KitchenHome({ onOpen }: { onOpen: (s: Section) => void }) {
  const k = useKitchen();
  const today = formatDateISO(new Date());
  const ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
  const slots = [...(k.week?.plan.days.find((d) => d.date === today)?.meals ?? [])].sort((x, y) => ORDER.indexOf(x.type) - ORDER.indexOf(y.type));
  const meals = slots.filter((m) => !m.needsAI);
  // The little one's plate: tonight's dinner, or the next real meal of the day.
  // The little one's next plate: the meal that fits the time of day (tomorrow's breakfast late at night).
  const pick = mealForNow({ days: [...(k.week?.plan.days ?? []), ...(k.nextWeek?.plan.days ?? [])] });
  useFreshMealPhotos(meals.length ? meals : undefined);
  const toBuy = k.items.filter((i) => !i.checked).length;
  const todayMs = new Date(`${today}T12:00:00`).getTime();
  const expiring = k.pantry.filter((i) => {
    const { date } = effectiveExpiry(i);
    return !!date && (new Date(`${date}T12:00:00`).getTime() - todayMs) / 86_400_000 <= 3;
  }).length;

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.dinner}>
        <View style={styles.star} pointerEvents="none">
          <StarPattern size={170} color={colors.gold} strokeWidth={0.8} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={12} weight="bold" color={colors.goldText} style={{ letterSpacing: 0.5 }}>
            {tr('TODAY’S MEALS')}
          </T>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onOpen('plan')}>
            <T size={12.5} weight="bold" color={colors.goldText}>
              {tr('Whole week ›')}
            </T>
          </Pressable>
        </View>
        {slots.length ? (
          <View style={{ gap: 2 }}>
            {slots.map((m) => (
              <Pressable
                key={m.type}
                accessibilityRole="button"
                onPress={() => (m.needsAI ? onOpen('plan') : openMeal(m, today))}
                style={({ pressed }) => [styles.slot, pressed && { opacity: 0.8 }]}
              >
                {m.needsAI ? (
                  <View style={styles.slotEmpty}>
                    <T size={16}>✨</T>
                  </View>
                ) : (
                  <Photo uri={mealImage(m)} size={44} radius={12} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={11} weight="bold" color={colors.goldText} style={{ letterSpacing: 0.4 }}>
                    {tr(m.type[0].toUpperCase() + m.type.slice(1)).toUpperCase()}
                  </T>
                  <T size={15} weight="bold" color={colors.linen} numberOfLines={1}>
                    {m.needsAI ? tr('New {0} idea', [tr(m.needsAI)]) : tr(m.name)}
                  </T>
                </View>
                {m.needsAI ? (
                  <T size={12.5} weight="bold" color={colors.goldText}>
                    {tr('Create')}
                  </T>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => onOpen('plan')} style={{ gap: 4 }}>
            <T size={18} weight="extrabold" color={colors.linen}>
              {tr('Plan your week in seconds')}
            </T>
            <T size={13.5} color={colors.goldText}>
              {tr('Halal meals sized for your family, with a shopping list that fills itself.')}
            </T>
          </Pressable>
        )}
      </View>

      <LittlePlatesCard dinner={pick ? { meal: pick.meal, when: pick.when, open: () => openMeal(pick.meal, pick.date, true) } : null} />

      <LunchboxCard />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Tile icon="recipes" tint={colors.tint} iconColor={colors.walnut} title={tr('Recipes')} sub={tr('Halal library')} onPress={() => onOpen('recipes')} />
        <Tile
          icon="cart"
          tint={colors.amberTint}
          iconColor={colors.amberText}
          title={tr('Shopping')}
          sub={toBuy ? tr('{0} to buy', [toBuy]) : tr('All done')}
          subColor={toBuy ? colors.amberText : colors.muted}
          onPress={() => onOpen('shopping')}
        />
        <Tile
          icon="pantry"
          tint={colors.brickTint}
          iconColor={colors.brickText}
          title={tr('Pantry')}
          sub={expiring ? tr('{0} expire soon', [expiring]) : tr('{0} items', [k.pantry.length])}
          subColor={expiring ? colors.brickText : colors.muted}
          onPress={() => onOpen('pantry')}
        />
      </View>

    </View>
  );
}

/** Little Plates: the little one's plate for tonight's dinner (or the next meal of the day). */
function LittlePlatesCard({ dinner }: { dinner: { meal: MockMeal; when: string; open: () => void } | null }) {
  const ones = useLittleOnes();
  const eating = ones.filter((o) => o.stage);
  const youngest = eating[0];
  if (!ones.length) {
    return (
      <Pressable accessibilityRole="button" onPress={() => router.push('/family')} style={({ pressed }) => [styles.soon, pressed && { opacity: 0.9 }]}>
        <View style={styles.soonIcon}>
          <Icon name="family" size={20} color={colors.amberText} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={14} weight="bold">
            {tr('Little Plates')}
          </T>
          <T size={12.5} color={colors.muted}>
            {tr('Add a little one’s birth date in Family to see baby and toddler versions of your meals.')}
          </T>
        </View>
        <Icon name="chevron" size={16} color={colors.walnut} />
      </Pressable>
    );
  }
  const names = eating.map((o) => o.name).join(', ');
  const changes = youngest?.stage && dinner ? littleChanges(dinner.meal.ingredients.map((i) => i.name), youngest.stage).filter((c) => c.action !== 'allergen') : [];
  const title = !youngest
    ? tr('Milk only for now')
    : dinner
      ? dinner.when === 'tomorrow'
        ? tr('{0}’s plate tomorrow', [names])
        : dinner.when === 'dinner'
          ? tr('{0}’s plate tonight', [names])
          : tr('{0}’s plate today', [names])
      : tr('{0}’s plates', [names]);
  const sub = !youngest
    ? tr('{0} is under 6 months: milk only for now. Baby versions start at about 6 months.', [ones.map((o) => o.name).join(', ')])
    : !dinner
      ? tr('Open any meal to see its baby or toddler version.')
      : changes.length === 1
        ? tr('{0}: 1 change. {1}', [tr(dinner.meal.name), tr(changes[0].text)])
        : changes.length
          ? tr('{0}: {1} changes, starting with: {2}', [tr(dinner.meal.name), changes.length, tr(changes[0].text)])
          : tr('{0} is ready for little ones. Just adjust the texture.', [tr(dinner.meal.name)]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={youngest && dinner ? dinner.open : youngest ? () => onOpenPlan() : () => router.push('/family')}
      style={({ pressed }) => [styles.little, pressed && { opacity: 0.92 }]}
    >
      <T size={12} weight="bold" color={colors.amberText} style={{ letterSpacing: 0.5 }}>
        {youngest ? tr('LITTLE PLATES · {0}', [`${names.toUpperCase()}, ${ageLabel(youngest.months).toUpperCase()}`]) : tr('LITTLE PLATES')}
      </T>
      <T size={17} weight="extrabold" color="#4A3416">
        {title}
      </T>
      <T size={13} color="#6B4A1E" numberOfLines={3} style={{ lineHeight: 18 }}>
        {sub}
      </T>
      {youngest && dinner ? (
        <View style={styles.littleBtn}>
          <T size={13} weight="bold" color={colors.linen}>
            {tr('See {0}’s plate', [eating[0].name])}
          </T>
        </View>
      ) : null}
    </Pressable>
  );
}

const onOpenPlan = () => router.push({ pathname: '/kitchen', params: { section: 'plan' } });

/** The children's next school lunchbox: picked, waiting for a pick, or not planned yet. */
function LunchboxCard() {
  const target = useMemo(() => nextSchoolDay(), []);
  const lang = getLang();
  const [state, setState] = useState<{ plan: LunchboxPlan; ideas: LunchboxIdea[] } | null | undefined>(undefined);
  useEffect(() => {
    loadLunchboxPlan(target.weekStart)
      .then(setState)
      .catch(() => setState(null));
  }, [target.weekStart]);

  const day = state?.plan.days.find((d) => d.date === target.date);
  const names = state?.plan.children.map((c) => c.name).filter(Boolean).join(', ') ?? '';
  const chosen = day && day.chosen !== null ? optionView(day.options[day.chosen], state!.ideas, lang) : null;
  const when = target.isTomorrow ? tr('Tomorrow') : tr('Monday');

  let title: string;
  let sub: string;
  let action: string;
  if (!day) {
    title = tr('Plan the school lunchboxes');
    sub = tr('3 nut-free, halal ideas a day for your children to pick.');
    action = tr('Plan lunchboxes');
  } else if (chosen) {
    title = tr('{0}: {1}', [when, chosen.name]);
    sub = names ? tr('Picked by {0}', [names]) : tr('Picked');
    action = tr('See the week');
  } else {
    title = target.isTomorrow ? tr('Tomorrow’s lunchbox isn’t picked yet') : tr('Monday’s lunchbox isn’t picked yet');
    sub = names ? tr('3 nut-free, halal ideas for {0}', [names]) : tr('3 nut-free, halal ideas ready');
    action = tr('Let them choose');
  }

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/lunchbox')} style={({ pressed }) => [styles.lunch, pressed && { opacity: 0.92 }]}>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <T size={12} weight="bold" color={colors.sageDark} style={{ letterSpacing: 0.5 }}>
          {tr('SCHOOL LUNCHBOXES')}
        </T>
        <T size={17} weight="extrabold" color="#24402F" numberOfLines={2}>
          {state === undefined ? ' ' : title}
        </T>
        <T size={13} color={colors.sageDark} numberOfLines={2}>
          {state === undefined ? ' ' : sub}
        </T>
        <View style={styles.lunchBtn}>
          <T size={13} weight="bold" color={colors.linen}>
            {action}
          </T>
        </View>
      </View>
      {chosen?.image ? (
        <Photo uri={chosen.image} size={96} radius={16} />
      ) : (
        <View style={styles.bento} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.cell, { backgroundColor: colors.amberTint }]} />
          <View style={[styles.cell, { backgroundColor: colors.brickTint }]} />
          <View style={[styles.cell, { backgroundColor: colors.sageTint }]} />
          <View style={[styles.cell, { backgroundColor: colors.tint }]} />
        </View>
      )}
    </Pressable>
  );
}

function Tile({
  icon,
  tint,
  iconColor,
  title,
  sub,
  subColor = colors.muted,
  onPress,
}: {
  icon: IconName;
  tint: string;
  iconColor: string;
  title: string;
  sub: string;
  subColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${sub}`} onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <T size={14} weight="extrabold">
        {title}
      </T>
      <T size={12} weight="semibold" color={subColor} numberOfLines={1}>
        {sub}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dinner: { backgroundColor: colors.espresso, borderRadius: 24, padding: 18, gap: 12, overflow: 'hidden' },
  star: { position: 'absolute', right: -40, top: -40, opacity: 0.3 },
  lunch: { backgroundColor: colors.sageTint, borderRadius: 24, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  lunchBtn: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: colors.sageDark, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  bento: { width: 96, height: 80, borderRadius: 16, backgroundColor: colors.card, borderWidth: 3, borderColor: colors.sage, padding: 5, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: '46%', flexGrow: 1, height: '44%', borderRadius: 7 },
  tile: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 12, gap: 6 },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  little: { backgroundColor: colors.amberTint, borderRadius: 24, padding: 18, gap: 6 },
  littleBtn: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: colors.amberText, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  slotEmpty: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.goldText, alignItems: 'center', justifyContent: 'center' },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14 },
  soonIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.amberTint, alignItems: 'center', justifyContent: 'center' },
});
