import { StyleSheet, View } from 'react-native';

import { StarPattern } from '@/components/art';
import { ComingNext, TabScreen } from '@/components/screen';
import { T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

function todayLabel() {
  return new Date().toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function Today() {
  const { firstName } = useAuth();
  return (
    <TabScreen title={todayLabel()} subtitle={`Assalamu alaikum${firstName ? `, ${firstName}` : ''}`}>
      <View style={styles.prayer}>
        <View style={styles.star} pointerEvents="none">
          <StarPattern size={190} color={colors.gold} strokeWidth={0.8} />
        </View>
        <T size={13} weight="semibold" color={colors.goldText} style={{ letterSpacing: 0.4 }}>
          NEXT PRAYER
        </T>
        <T size={28} weight="extrabold" color={colors.linen} style={{ marginTop: 6 }}>
          Prayer times
        </T>
        <T size={14} color="#E9DCCD" style={{ marginTop: 4 }}>
          Your next prayer and adhan alerts will show here in step 3.
        </T>
      </View>
      <ComingNext step={4} title="Tonight’s dinner" text="Your meal plan, sized for your family, with what is already in your pantry." />
      <ComingNext step={5} title="Use soon" text="Pantry items close to their date, so nothing goes to waste." />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  prayer: { backgroundColor: colors.espresso, borderRadius: 24, padding: 20, overflow: 'hidden' },
  star: { position: 'absolute', right: -50, top: -40, opacity: 0.35 },
});
