import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LunchboxView } from '@/components/lunchbox-view';
import { HomeButton } from '@/components/screen';
import { T } from '@/components/ui';
import { tr } from '@/lib/i18n';
import { colors } from '@/theme';

/** School lunchboxes on their own screen (also shown inside Meal plan). */
export default function Lunchbox() {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('School lunchboxes')}
        </T>
        <T size={14.5} color={colors.muted}>
          {tr('3 lunchbox ideas a day, so your child picks. Always nut-free and halal, with no sweets, and safe for little ones.')}
        </T>
        <LunchboxView />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
});
