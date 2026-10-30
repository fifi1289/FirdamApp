import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon, type IconName, Logo } from '@/components/art';
import { T } from '@/components/ui';
import { HOME_FEATURES, ringPoint, type HomeFeatureId } from '@/shared/home-features';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

const ICONS: Record<HomeFeatureId, IconName> = {
  prayer: 'prayer',
  qibla: 'qibla',
  quran: 'quran',
  fasting: 'fasting',
  halal: 'halal',
  meals: 'kitchen',
  recipes: 'recipes',
  shopping: 'cart',
  pantry: 'pantry',
  finance: 'money',
  calendar: 'calendar',
  family: 'family',
  learning: 'learning',
  services: 'services',
};

/*
 * Layout at full size (366 px wide, scaled down on smaller phones):
 * hub 76, bubbles 66, inner ring radius 76, outer ring radius 148. The rings
 * are far enough apart that their bubbles never touch.
 */
const BASE = 366;
const HUB = 76;
const BUBBLE = 66;
const INNER_R = 76;
const OUTER_R = 148;

const inner = HOME_FEATURES.filter((f) => f.ring === 'inner');
const outer = HOME_FEATURES.filter((f) => f.ring === 'outer');

/**
 * Home: every feature in two rings around the Firdam logo (they stay still, so every button is easy to find and tap) —
 * faith and family close in, everyday living around them.
 */
export function FeatureRing() {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 24, BASE);
  const k = size / BASE;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }} accessibilityLabel={tr('Firdam features')}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={center} cy={center} r={OUTER_R * k} stroke={colors.sand} strokeWidth={1} strokeDasharray="2 7" fill="none" />
        <Circle cx={center} cy={center} r={INNER_R * k} stroke={colors.gold} strokeWidth={1} strokeDasharray="2 6" fill="none" opacity={0.7} />
      </Svg>

      <Ring items={outer} radius={OUTER_R * k} bubble={BUBBLE * k} size={size} tone="outer" />
      <Ring items={inner} radius={INNER_R * k} bubble={BUBBLE * k} size={size} tone="inner" />

      <View
        style={[styles.hub, { width: HUB * k, height: HUB * k, borderRadius: (HUB * k) / 2, left: center - (HUB * k) / 2, top: center - (HUB * k) / 2 }]}
        accessibilityRole="image"
        accessibilityLabel={tr('Firdam')}
      >
        <Logo size={Math.round(26 * k)} />
        <T weight="extrabold" size={Math.round(12.5 * k)} color={colors.walnut} style={{ marginTop: 2 }}>
          {tr('Firdam')}
        </T>
      </View>
    </View>
  );
}

function Ring({
  items,
  radius,
  bubble,
  size,
  tone,
}: {
  items: typeof HOME_FEATURES;
  radius: number;
  bubble: number;
  size: number;
  tone: 'inner' | 'outer';
}) {
  const center = size / 2;
  const scale = bubble / BUBBLE;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {items.map((f, i) => {
        const p = ringPoint(i, items.length);
        return (
          <View
            key={f.id}
            style={{
              position: 'absolute',
              left: center + p.x * radius - bubble / 2,
              top: center + p.y * radius - bubble / 2,
              width: bubble,
              height: bubble,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr(f.label)}
              onPress={() => router.push(f.app as Href)}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.bubble,
                    { width: bubble, height: bubble, borderRadius: bubble / 2 },
                    tone === 'inner' ? styles.inner : styles.outer,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon name={ICONS[f.id]} size={Math.round(21 * scale)} color={colors.walnut} />
                  <T
                    size={Math.max(8.5, Math.round(10 * scale * 10) / 10)}
                    weight="bold"
                    color={colors.espresso}
                    numberOfLines={2}
                    style={{ textAlign: 'center', lineHeight: Math.round(11 * scale), marginTop: 2, paddingHorizontal: 5 }}
                  >
                    {tr(f.label)}
                  </T>
                </View>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hub: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderWidth: 2.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  inner: { backgroundColor: colors.tint, borderColor: '#E2D2C1' },
  outer: { backgroundColor: colors.card, borderColor: colors.line },
  pressed: { backgroundColor: colors.sand, transform: [{ scale: 0.95 }] },
});
