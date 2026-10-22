import { Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { colors } from '@/theme';

/** A labelled on/off switch row, used for reminders and other choices. */
export function SwitchRow({ label, hint, on, onPress }: { label: string; hint?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <T size={15} weight="semibold">
          {label}
        </T>
        {hint ? (
          <T size={12.5} color={colors.muted}>
            {hint}
          </T>
        ) : null}
      </View>
      <View style={[styles.track, on && styles.trackOn]}>
        <View style={[styles.knob, on && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58 },
  track: { width: 48, height: 30, borderRadius: 15, backgroundColor: colors.sand, padding: 3 },
  trackOn: { backgroundColor: colors.sage },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  knobOn: { transform: [{ translateX: 18 }] },
});
