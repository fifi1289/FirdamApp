import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon, type IconName, StarPattern } from '@/components/art';
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
  finance: 'money',
  family: 'family',
};

const DOT = 56; // feature circle
const LABEL_W = 78;

/** Every feature around a ring with Firdam in the middle; tap one to open it. */
export function FeatureRing() {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 40, 340);
  const radius = size / 2 - DOT / 2 - 16;
  const center = size / 2;
  const hub = Math.round(size * 0.32);

  return (
    <View style={{ width: size, height: size + 14, alignSelf: 'center' }} accessibilityRole="menu" accessibilityLabel="Firdam features">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={center} cy={center} r={radius} stroke={colors.sand} strokeWidth={1.2} strokeDasharray="3 6" fill="none" />
      </Svg>

      <View
        style={[styles.hub, { width: hub, height: hub, borderRadius: hub / 2, left: center - hub / 2, top: center - hub / 2 }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.hubStar} pointerEvents="none">
          <StarPattern size={hub * 1.1} color={colors.gold} strokeWidth={1} />
        </View>
        <T weight="extrabold" size={Math.round(hub * 0.2)} color={colors.linen} style={{ letterSpacing: -0.3 }}>
          Firdam
        </T>
      </View>

      {HOME_FEATURES.map((f, i) => {
        const p = ringPoint(i, HOME_FEATURES.length);
        const cx = center + p.x * radius;
        const cy = center + p.y * radius;
        return (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            accessibilityLabel={f.label}
            onPress={() => router.push(f.app as Href)}
            style={[styles.item, { left: cx - LABEL_W / 2, top: cy - DOT / 2 }]}
          >
            {({ pressed }) => (
              <>
                <View style={[styles.dot, f.id === 'finance' && styles.dotSage, pressed && styles.dotPressed]}>
                  <Icon name={ICONS[f.id]} size={26} color={f.id === 'finance' ? colors.sageDark : colors.walnut} />
                </View>
                <T size={11.5} weight="semibold" style={styles.label} numberOfLines={2}>
                  {f.label}
                </T>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hub: {
    position: 'absolute',
    backgroundColor: colors.espresso,
    borderWidth: 3,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hubStar: { position: 'absolute', opacity: 0.25 },
  item: { position: 'absolute', width: LABEL_W, alignItems: 'center' },
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
  dotSage: { backgroundColor: colors.sageTint, borderColor: '#CFE0C6' },
  dotPressed: { backgroundColor: colors.sand, transform: [{ scale: 0.95 }] },
  label: { marginTop: 4, textAlign: 'center', lineHeight: 14, color: colors.espresso },
});
