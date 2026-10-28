import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/kitchen-ui';
import { PartnerCard } from '@/components/partner-shops';
import { HomeButton } from '@/components/screen';
import { Card, T } from '@/components/ui';
import { usePartnerShops } from '@/lib/partners';
import { LEARNING_NOTE, learningPartners, learningTopicsInUse } from '@/shared/partners';
import { colors } from '@/theme';

const COMING = [
  { title: 'Quran & tajweed', text: 'Online and local teachers for reading, tajweed and hifz.' },
  { title: 'Arabic', text: 'Classes for kids and adults, from the alphabet to fluency.' },
  { title: 'Islamic studies & hadith', text: 'Courses, halaqas and weekend Islamic schools.' },
  { title: 'For every family member', text: 'Kids’ programs, sisters-only classes and family courses.' },
];

/** Learning: trusted Quran, Arabic and Islamic studies teachers, the same as on firdam.com. */
export default function Learning() {
  const shops = usePartnerShops();
  const [topic, setTopic] = useState<string | null>(null);
  const topics = learningTopicsInUse(shops);
  const all = learningPartners(shops);
  const list = learningPartners(shops, topic);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          Learning
        </T>
        <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
          Learn Quran, tajweed, Arabic, hadith and more with trusted teachers and Islamic schools, for kids and adults.
        </T>

        {all.length ? (
          <>
            {topics.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[null, ...topics].map((t) => (
                  <Chip key={t ?? 'all'} label={t ?? 'All'} selected={topic === t} onPress={() => setTopic(t)} />
                ))}
              </ScrollView>
            ) : null}
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              LEARNING PARTNERS
            </T>
            {list.map((s) => (
              <PartnerCard key={s.id} shop={s} />
            ))}
            <T size={12} color={colors.muted}>
              {LEARNING_NOTE}
            </T>
          </>
        ) : (
          <Card style={{ gap: 12 }}>
            <T weight="bold" size={16}>
              Teachers and schools are joining soon, insha’Allah
            </T>
            <T size={13.5} color={colors.muted}>
              We’re partnering with trusted teachers so your family can learn in one place.
            </T>
            {COMING.map((c) => (
              <View key={c.title} style={styles.coming}>
                <T size={14.5} weight="semibold">
                  {c.title}
                </T>
                <T size={13} color={colors.muted}>
                  {c.text}
                </T>
              </View>
            ))}
            <T size={13.5} color={colors.muted}>
              {'Meanwhile, keep reading with '}
              <T size={13.5} weight="bold" color={colors.walnut} accessibilityRole="link" onPress={() => router.push('/quran')}>
                Quran & Duas
              </T>
              .
            </T>
          </Card>
        )}

        <T size={13} color={colors.muted}>
          {'Teach Quran, Arabic or Islamic studies? '}
          <T size={13} weight="bold" color={colors.walnut} accessibilityRole="link" onPress={() => Linking.openURL('https://firdam.com/partners')}>
            Become a Firdam learning partner ↗
          </T>
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  coming: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 2 },
});
