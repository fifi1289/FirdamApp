import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon, StarPattern, type IconName } from '@/components/art';
import { T } from '@/components/ui';
import { useFavourites } from '@/lib/home-favourites';
import { tr } from '@/lib/i18n';
import { PRAYERS, formatCountdown, formatTime, nextPrayer, useNow, usePrayerSettings } from '@/lib/prayer';
import { HOME_FEATURES, ringPoint, type HomeFeatureId } from '@/shared/home-features';
import { colors } from '@/theme';

export const FEATURE_ICONS: Record<HomeFeatureId, IconName> = {
  prayer: 'prayer',
  qibla: 'qibla',
  quran: 'quran',
  fasting: 'fasting',
  halal: 'halal',
  kitchen: 'kitchen',
  meals: 'plate',
  recipes: 'recipes',
  shopping: 'cart',
  pantry: 'pantry',
  finance: 'money',
  calendar: 'calendar',
  family: 'family',
  learning: 'learning',
  services: 'services',
  travel: 'travel',
};

/*
 * Layout at full size (340 px wide, scaled down on smaller phones): the next
 * prayer in a 150 px hub, the favourites in 72 px bubbles on a 128 px ring.
 */
const BASE = 340;
const HUB = 150;
const BUBBLE = 72;
const RADIUS = 128;

/**
 * Home: the next prayer in the middle, the family's 5 favourite features
 * around it, and an Edit bubble to change them. Everything else is in
 * "All features" (the /features screen).
 */
export function FeatureRing() {
  const { width } = useWindowDimensions();
  const { favourites } = useFavourites();
  const size = Math.min(width - 32, BASE);
  const k = size / BASE;
  const center = size / 2;
  const items = favourites.map((id) => HOME_FEATURES.find((f) => f.id === id)!).filter(Boolean);
  const slots = items.length + 1; // + Edit
  const bubble = BUBBLE * k;

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }} accessibilityLabel={tr('Your favourite features')}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={center} cy={center} r={RADIUS * k} stroke={colors.sand} strokeWidth={1.2} strokeDasharray="3 7" fill="none" />
      </Svg>

      {items.map((f, i) => {
        const p = ringPoint(i, slots);
        return (
          <Bubble
            key={f.id}
            left={center + p.x * RADIUS * k - bubble / 2}
            top={center + p.y * RADIUS * k - bubble / 2}
            size={bubble}
            icon={FEATURE_ICONS[f.id]}
            label={tr(f.label)}
            strong={f.id === 'kitchen'}
            onPress={() => router.push(f.app as Href)}
          />
        );
      })}
      {(() => {
        const p = ringPoint(items.length, slots);
        return (
          <Bubble
            left={center + p.x * RADIUS * k - bubble / 2}
            top={center + p.y * RADIUS * k - bubble / 2}
            size={bubble}
            label={tr('Edit')}
            dashed
            hint={tr('Choose your favourite features')}
            onPress={() => router.push({ pathname: '/features', params: { edit: '1' } })}
          />
        );
      })()}

      <PrayerHub size={HUB * k} left={center - (HUB * k) / 2} top={center - (HUB * k) / 2} />
    </View>
  );
}

function Bubble({
  left,
  top,
  size,
  icon,
  label,
  onPress,
  strong = false,
  dashed = false,
  hint,
}: {
  left: number;
  top: number;
  size: number;
  icon?: IconName;
  label: string;
  onPress: () => void;
  strong?: boolean;
  dashed?: boolean;
  hint?: string;
}) {
  const scale = size / BUBBLE;
  return (
    <View style={{ position: 'absolute', left, top, width: size, height: size }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} onPress={onPress}>
        {({ pressed }) => (
          <View
            style={[
              styles.bubble,
              { width: size, height: size, borderRadius: size / 2 },
              strong ? styles.strong : dashed ? styles.dashed : styles.plain,
              pressed && styles.pressed,
            ]}
          >
            {icon ? (
              <Icon name={icon} size={Math.round(22 * scale)} color={strong ? colors.linen : colors.walnut} />
            ) : (
              <T size={Math.round(22 * scale)} weight="bold" color={colors.walnut} style={{ lineHeight: Math.round(24 * scale) }}>
                +
              </T>
            )}
            <T
              size={Math.max(9, Math.round(10.5 * scale * 10) / 10)}
              weight="bold"
              color={strong ? colors.linen : colors.espresso}
              numberOfLines={2}
              style={{ textAlign: 'center', lineHeight: Math.round(12 * scale), marginTop: 2, paddingHorizontal: 5 }}
            >
              {label}
            </T>
          </View>
        )}
      </Pressable>
    </View>
  );
}

/** The next prayer, in the middle of the ring; opens Prayer. */
function PrayerHub({ size, left, top }: { size: number; left: number; top: number }) {
  const { settings } = usePrayerSettings();
  const now = useNow();
  const place = settings?.place ?? null;
  const next = settings && place ? nextPrayer(settings, place, now) : null;
  const info = next ? PRAYERS.find((p) => p.id === next.id) : null;
  const k = size / HUB;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={next && info ? tr('Next prayer: {0} at {1}', [tr(info.name), formatTime(next.at)]) : tr('Prayer times')}
      onPress={() => router.push('/prayer')}
      style={[styles.hub, { width: size, height: size, borderRadius: size / 2, left, top }]}
    >
      <View style={styles.hubStar} pointerEvents="none">
        <StarPattern size={size * 1.1} color={colors.gold} strokeWidth={0.8} />
      </View>
      {next && info ? (
        <>
          <T size={Math.round(11 * k)} weight="bold" color={colors.goldText} style={{ letterSpacing: 0.6 }}>
            {tr(info.name).toUpperCase()}
          </T>
          <T size={Math.round(27 * k)} weight="extrabold" color={colors.linen}>
            {formatTime(next.at)}
          </T>
          <T size={Math.round(11.5 * k)} color={colors.goldText} numberOfLines={1} style={{ paddingHorizontal: 10 }}>
            {formatCountdown(next.at.getTime() - now.getTime())}
          </T>
        </>
      ) : (
        <>
          <Icon name="prayer" size={Math.round(24 * k)} color={colors.goldText} />
          <T size={Math.round(13 * k)} weight="bold" color={colors.linen} style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 14 }}>
            {tr('Set your location')}
          </T>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hub: { position: 'absolute', backgroundColor: colors.espresso, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 2 },
  hubStar: { position: 'absolute', opacity: 0.25 },
  bubble: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  plain: { backgroundColor: colors.card, borderColor: colors.line },
  strong: { backgroundColor: colors.walnut, borderColor: colors.walnut },
  dashed: { backgroundColor: colors.card, borderColor: colors.sand, borderStyle: 'dashed', borderWidth: 1.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
});
