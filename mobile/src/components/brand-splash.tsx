import { StyleSheet, View } from 'react-native';

import { Logo, StarPattern } from '@/components/art';
import { T } from '@/components/ui';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

/** Shown while the app starts: the logo, the name and the slogan. */
export function BrandSplash() {
  return (
    <View style={styles.screen} accessibilityLabel={tr('Firdam. One home for your Muslim life.')}>
      <View style={styles.star} pointerEvents="none">
        <StarPattern size={460} />
      </View>
      <Logo size={88} />
      <T weight="extrabold" size={34} style={{ marginTop: 18 }}>
        {tr('Firdam')}
      </T>
      <T size={16} color="#5F5048" style={styles.slogan}>
        {tr('One home for your Muslim life.')}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.linen, padding: 32 },
  star: { position: 'absolute', top: -120, right: -140, opacity: 0.7 },
  slogan: { marginTop: 10, textAlign: 'center', lineHeight: 23, maxWidth: 280 },
});
