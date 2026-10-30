import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Logo, StarPattern } from '@/components/art';
import { Card, T } from '@/components/ui';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

/** Back to the Home ring, from any feature. */
export function HomeButton({ onDark = false }: { onDark?: boolean }) {
  const color = onDark ? colors.goldText : colors.walnut;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr('Back to Home')}
      hitSlop={8}
      onPress={() => router.dismissTo('/')}
      style={[styles.home, onDark && styles.homeDark]}
    >
      <Icon name="back" size={18} color={color} />
      <T size={14} weight="bold" color={color}>
        {tr('Home')}
      </T>
    </Pressable>
  );
}

/**
 * A feature screen: linen background, a large title and scrolling content.
 * Home itself passes `home` and shows no back button.
 */
export function TabScreen({
  title,
  subtitle,
  home = false,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  home?: boolean;
  /** Shown at the top right (Home's notification bell). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {home ? (action ? <View style={styles.actionRow}>{action}</View> : null) : (
          <View style={styles.brandBar}>
            <HomeButton />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel={tr('Firdam')}>
              <Logo size={22} />
              <T weight="extrabold" size={15} color={colors.walnut}>
                {tr('Firdam')}
              </T>
            </View>
          </View>
        )}
        {subtitle ? (
          <T size={14} weight="medium" color={colors.muted}>
            {subtitle}
          </T>
        ) : null}
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {title}
        </T>
        <View style={{ marginTop: 16, gap: 16 }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** A soft card saying which step brings this screen to life. */
export function ComingNext({ step, title, text }: { step: number; title: string; text: string }) {
  return (
    <Card style={{ backgroundColor: colors.tint, borderColor: colors.tint, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -40, bottom: -50, opacity: 0.7 }} pointerEvents="none">
        <StarPattern size={150} strokeWidth={1} />
      </View>
      <T size={12} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.5 }}>
        {tr('COMING IN STEP {0}', [step])}
      </T>
      <T size={17} weight="extrabold" style={{ marginTop: 4 }}>
        {title}
      </T>
      <T size={14} color="#5F5048" style={{ marginTop: 4, lineHeight: 20 }}>
        {text}
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  brandBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  home: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 36, paddingLeft: 6, paddingRight: 12, borderRadius: 18, backgroundColor: colors.tint },
  homeDark: { backgroundColor: '#4A372F' },
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
});
