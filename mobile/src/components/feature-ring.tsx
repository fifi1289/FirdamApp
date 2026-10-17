import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon, type IconName, Logo } from '@/components/art';
import { T } from '@/components/ui';
import { HOME_FEATURES, ringPoint, type HomeFeatureId } from '@/shared/home-features';
import { colors } from '@/theme';

const ICONS: Record<HomeFeatureId, IconName> = {
  prayer: 'prayer',
  qibla: 'qibla',
  halal: 'halal',
  meals: 'kitchen',
  recipes: 'recipes',
  shopping: 'cart',
  pantry: 'pantry',
  finance: 'money',
  calendar: 'calendar',
  family: 'family',
};

const DOT = 50; // feature circle
const LABEL_W = 72;
/** One slow turn of the ring, in ms: a gentle drift, easy to tap. */
const TURN_MS = 120_000;

/** Turns 0 → 1 forever unless the phone asks for reduced motion. */
function useSlowSpin() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce || cancelled) return;
        anim = Animated.loop(Animated.timing(spin, { toValue: 1, duration: TURN_MS, easing: Easing.linear, useNativeDriver: true }));
        anim.start();
      });
    return () => {
      cancelled = true;
      anim?.stop();
    };
  }, [spin]);
  return spin;
}

/**
 * Home: every feature around a slowly turning ring with the Firdam logo in the
 * middle. The labels stay upright while the ring turns.
 */
export function FeatureRing() {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 40, 340);
  const radius = size / 2 - DOT / 2 - 18;
  const center = size / 2;
  const hub = Math.round(size * 0.36);

  const spin = useSlowSpin();
  const turn = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const upright = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={{ width: size, height: size, alignSelf: 'center', marginBottom: 8 }} accessibilityLabel="Firdam features">
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: turn }] }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Circle cx={center} cy={center} r={radius} stroke={colors.sand} strokeWidth={1.2} strokeDasharray="3 6" fill="none" />
        </Svg>
        {HOME_FEATURES.map((f, i) => {
          const p = ringPoint(i, HOME_FEATURES.length);
          return (
            // The box is centred on the circle, so turning it back keeps the label below.
            <Animated.View
              key={f.id}
              style={[
                styles.item,
                { left: center + p.x * radius - LABEL_W / 2, top: center + p.y * radius - DOT / 2, transform: [{ rotate: upright }] },
              ]}
            >
              <Pressable accessibilityRole="button" accessibilityLabel={f.label} onPress={() => router.push(f.app as Href)} hitSlop={6}>
                {({ pressed }) => (
                  <View style={[styles.dot, pressed && styles.dotPressed]}>
                    <Icon name={ICONS[f.id]} size={24} color={colors.walnut} />
                  </View>
                )}
              </Pressable>
              <T size={11.5} weight="semibold" style={styles.label} numberOfLines={2}>
                {f.label}
              </T>
            </Animated.View>
          );
        })}
      </Animated.View>

      <View
        style={[styles.hub, { width: hub, height: hub, borderRadius: hub / 2, left: center - hub / 2, top: center - hub / 2 }]}
        accessibilityRole="image"
        accessibilityLabel="Firdam"
      >
        <Logo size={Math.round(hub * 0.36)} />
        <T weight="extrabold" size={Math.round(hub * 0.16)} color={colors.walnut} style={{ marginTop: 4, letterSpacing: -0.2 }}>
          Firdam
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hub: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: { position: 'absolute', width: LABEL_W, height: DOT, alignItems: 'center' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPressed: { backgroundColor: colors.sand, transform: [{ scale: 0.95 }] },
  label: { position: 'absolute', top: DOT + 4, width: LABEL_W, textAlign: 'center', lineHeight: 14, color: colors.espresso },
});
