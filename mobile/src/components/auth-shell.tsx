import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/art';
import { T } from '@/components/ui';
import { colors } from '@/theme';

/** The frame shared by the sign-in, sign-up and code screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  canGoBack = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  canGoBack?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {canGoBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
              style={styles.back}
            >
              <Icon name="back" size={22} color={colors.espresso} />
            </Pressable>
          )}
          <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
            {title}
          </T>
          {subtitle ? (
            <T size={15} color={colors.muted} style={{ marginTop: 6, lineHeight: 22 }}>
              {subtitle}
            </T>
          ) : null}
          <View style={{ marginTop: 28, gap: 16 }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** A short message under a form: an error in brick red, or a note in sage green. */
export function FormMessage({ text, tone = 'error' }: { text: string | null; tone?: 'error' | 'success' }) {
  if (!text) return null;
  const isError = tone === 'error';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        borderRadius: 14,
        padding: 12,
        backgroundColor: isError ? colors.brickTint : colors.sageTint,
      }}
    >
      <T size={14} weight="semibold" color={isError ? colors.brickText : colors.sageDark}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 },
  back: { width: 44, height: 44, marginLeft: -10, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
});
