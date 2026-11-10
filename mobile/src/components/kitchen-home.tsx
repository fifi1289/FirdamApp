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
import { optionView, type LunchboxIdea, type LunchboxPlan } from '@/shared/lunchbox-core';
import { formatPortions } from '@/shared/pantry-portions';
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
  const meals = (k.week?.plan.days.find((d) => d.date === today)?.meals ?? []).filter((m) => !m.needsAI);
  const dinner = meals.find((m) => m.type === 'dinner') ?? meals[meals.length - 1];
  useFreshMealPhotos(dinner ? [dinner] : undefined);
  const toBuy = k.items.filter((i) => !i.checked).length;
  const todayMs = new Date(`${today}T12:00:00`).getTime();
  const expiring = k.pantry.filter((i) => i.expiration_date && (new Date(`${i.expiration_date}T12:00:00`).getTime() - todayMs) / 86_400_000 <= 3).length;

  return (
    <View style={{ gap: 14 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => (dinner ? openMeal(dinner, today) : onOpen('plan'))}
        style={({ pressed }) => [styles.dinner, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.star} pointerEvents="none">
          <StarPattern size={170} color={colors.gold} strokeWidth={0.8} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={12} weight="bold" color={colors.goldText} style={{ letterSpacing: 0.5 }}>
            {dinner && dinner.type === 'dinner' ? tr('MEAL PLAN · TONIGHT') : tr('MEAL PLAN')}
          </T>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onOpen('plan')}>
            <T size={12.5} weight="bold" color={colors.goldText}>
              {tr('Whole week ›')}
            </T>
          </Pressable>
        </View>
        {dinner ? (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Photo uri={mealImage(dinner)} size={72} radius={16} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <T size={18} weight="extrabold" color={colors.linen} numberOfLines={2}>
                {tr(dinner.name)}
              </T>
              <T size={13} color={colors.goldText}>
                {tr('{0} min · for {1}', [dinner.prepTime + dinner.cookTime, formatPortions(dinner.servings)])}
              </T>
            </View>
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <T size={18} weight="extrabold" color={colors.linen}>
              {tr('Plan your week in seconds')}
            </T>
            <T size={13.5} color={colors.goldText}>
              {tr('Halal meals sized for your family, with a shopping list that fills itself.')}
            </T>
          </View>
        )}
      </Pressable>

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

      <View style={styles.soon}>
        <View style={styles.soonIcon}>
          <Icon name="family" size={20} color={colors.amberText} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={14} weight="bold">
            {tr('Little Plates · coming soon')}
          </T>
          <T size={12.5} color={colors.muted}>
            {tr('Baby and toddler versions of your family meals')}
          </T>
        </View>
      </View>
    </View>
  );
}

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
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sand, borderRadius: 18, padding: 14 },
  soonIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.amberTint, alignItems: 'center', justifyContent: 'center' },
});
