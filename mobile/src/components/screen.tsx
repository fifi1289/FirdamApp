import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarPattern } from '@/components/art';
import { Card, T } from '@/components/ui';
import { colors } from '@/theme';

/** A tab screen: linen background, a large title and scrolling content. */
export function TabScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
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
        {`COMING IN STEP ${step}`}
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
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
});
