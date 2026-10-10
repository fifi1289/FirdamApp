import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Logo, StarPattern, type IconName } from '@/components/art';
import { Button, T } from '@/components/ui';
import { colors } from '@/theme';

const points: { icon: IconName; bg: string; color: string; title: string; text: string }[] = [
  { icon: 'kitchen', bg: colors.tint, color: colors.walnut, title: 'Plans built from your pantry', text: 'Sized for adults and kids, ready in seconds' },
  { icon: 'shield', bg: colors.sageTint, color: colors.sage, title: 'Safe for every allergy', text: '204 halal recipes from 60 cuisines' },
  { icon: 'prayer', bg: colors.amberTint, color: '#9A6A2F', title: 'Adhan alerts for every prayer', text: 'Works offline, wherever you are' },
];

export default function Welcome() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.star} pointerEvents="none">
        <StarPattern size={420} />
      </View>

      <View style={styles.brand}>
        <Logo size={40} />
        <T weight="bold" size={24}>
          Firdam
        </T>
      </View>

      <View style={{ marginTop: 56 }}>
        <T style={styles.arabic} size={22} color={colors.walnut}>
          بِسْمِ ٱللَّٰهِ
        </T>
        <T weight="extrabold" size={34} style={styles.title} accessibilityRole="header">
          Your halal kitchen, planned for the whole family.
        </T>
        <T size={16} color="#5F5048" style={{ marginTop: 14, lineHeight: 24 }}>
          Weekly meals from what is already in your cupboard, one shared shopping list, and prayer times at a glance.
        </T>
      </View>

      <View style={{ marginTop: 32, gap: 18 }}>
        {points.map((p) => (
          <View key={p.title} style={styles.point}>
            <View style={[styles.pointIcon, { backgroundColor: p.bg }]}>
              <Icon name={p.icon} size={22} color={p.color} />
            </View>
            <View style={{ flex: 1 }}>
              <T weight="bold">{p.title}</T>
              <T size={13} color={colors.muted}>
                {p.text}
              </T>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Get started — it's free" onPress={() => router.push('/sign-up')} />
        <Button label="I already have an account" variant="text" onPress={() => router.push('/sign-in')} />
        <T size={12.5} color={colors.muted} style={{ textAlign: 'center' }}>
          Prayer times, Qibla, halal places near you and a family kitchen that plans halal meals around what you have.
        </T>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen, paddingHorizontal: 28, paddingBottom: 12, overflow: 'hidden' },
  star: { position: 'absolute', right: -150, top: -60, opacity: 0.5 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  arabic: { fontFamily: 'Amiri_400Regular', textAlign: 'left', writingDirection: 'rtl' },
  title: { marginTop: 12, lineHeight: 40, letterSpacing: -0.8 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pointIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 'auto', gap: 10 },
});
