import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { T } from '@/components/ui';
import { colors } from '@/theme';

/** A food photo with a soft placeholder while loading or when there is none. */
export function Photo({ uri, size, height, radius = 14, style }: { uri?: string | null; size?: number; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size ?? '100%', height: height ?? size ?? 160, borderRadius: radius } as const;
  return (
    <View style={[box, styles.photo, style]} accessibilityRole="image" accessibilityLabel="Recipe photo">
      <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" style={{ position: 'absolute' }}>
        <Path d="M3 13h18a9 9 0 0 1-18 0z" stroke="#9A6A4E" strokeWidth={1.4} strokeLinejoin="round" />
        <Path d="M8 9c0-2 2-2 2-4M12 9c0-2 2-2 2-4M16 9c0-2 2-2 2-4" stroke="#9A6A4E" strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
      {uri && !failed ? <Image source={{ uri }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} resizeMode="cover" onError={() => setFailed(true)} /> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, tone = 'walnut' }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'walnut' | 'sage' }) {
  const on = !!selected;
  const bg = on ? (tone === 'sage' ? colors.sageDark : colors.espresso) : 'transparent';
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: on } : undefined}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg, borderColor: on ? bg : colors.sand }]}
    >
      <T size={13} weight={on ? 'bold' : 'semibold'} color={on ? colors.linen : colors.espresso}>
        {label}
      </T>
    </Pressable>
  );
}

/** A small coloured label: sage = good, amber = attention, brick = warning. */
export function Badge({ label, tone }: { label: string; tone: 'sage' | 'amber' | 'brick' | 'walnut' }) {
  const map = {
    sage: [colors.sageTint, colors.sageDark],
    amber: [colors.amberTint, colors.amberText],
    brick: [colors.brickTint, colors.brickText],
    walnut: [colors.tint, '#5F4033'],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <T size={12} weight="bold" color={fg}>
        {label}
      </T>
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)} style={[styles.segmentItem, on && styles.segmentOn]}>
            <T size={13} weight={on ? 'bold' : 'semibold'} color={on ? colors.espresso : colors.muted}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.check, checked && { backgroundColor: colors.sage, borderColor: colors.sage }]}>
      {checked && (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12l5 5 9-10" stroke={colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: '#E9D2B9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' },
  segment: { flexDirection: 'row', gap: 4, backgroundColor: '#EFE6DC', borderRadius: 14, padding: 4 },
  segmentItem: { flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
});
