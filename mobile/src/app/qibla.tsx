import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QiblaCompass } from '@/components/qibla';
import { Button, Card, T } from '@/components/ui';
import { qiblaDirection, usePrayerSettings } from '@/lib/prayer';
import { colors } from '@/theme';

/** A full-size Qibla compass, opened from the ring on Home. */
export default function Qibla() {
  const { settings } = usePrayerSettings();
  const place = settings?.place ?? null;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <T weight="extrabold" size={22} accessibilityRole="header">
          Qibla
        </T>
        <Button label="Done" variant="text" onPress={() => router.back()} />
      </View>
      <View style={styles.body}>
        {place ? (
          <>
            <T size={14} color={colors.muted} style={{ textAlign: 'center' }}>
              {`Direction of the Kaaba from ${place.label}`}
            </T>
            <QiblaCompass bearing={qiblaDirection(place)} size={260} />
            <T size={12.5} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18, maxWidth: 300 }}>
              Keep the phone flat and away from metal or magnets for the best reading.
            </T>
          </>
        ) : (
          <Card style={{ gap: 10, alignSelf: 'stretch' }}>
            <T size={16} weight="bold">
              Set your location first
            </T>
            <T size={14} color={colors.muted}>
              Firdam uses your city to point you to the Kaaba.
            </T>
            <Button label="Set location" onPress={() => router.push('/prayer-settings')} />
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 20 },
});
