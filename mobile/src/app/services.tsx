import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/kitchen-ui';
import { PartnerCard } from '@/components/partner-shops';
import { HomeButton } from '@/components/screen';
import { Card, T } from '@/components/ui';
import { usePartnerShops } from '@/lib/partners';
import { SERVICES_NOTE, serviceGroupsInUse, servicePartners } from '@/shared/partners';
import { colors } from '@/theme';

const COMING = [
  { title: 'Home', text: 'Renovation, cleaning, moving, plumbing and electrical, property management.' },
  { title: 'Professional', text: 'Accountants for zakat and taxes, lawyers and wills, real estate, Islamic finance.' },
  { title: 'Business & digital', text: 'Website creation, marketing and social media, graphic design, business and project management.' },
  { title: 'Events', text: 'Halal catering, henna, photography and event planning.' },
  { title: 'Travel', text: 'Hajj and Umrah operators and travel agencies.' },
];

/** Services: trusted Muslim-owned local businesses families hire, the same as on firdam.com. */
export default function Services() {
  const shops = usePartnerShops();
  const [group, setGroup] = useState<string | null>(null);
  const groups = serviceGroupsInUse(shops);
  const all = servicePartners(shops);
  const list = servicePartners(shops, group);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          Services
        </T>
        <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
          Trusted Muslim-owned businesses for your home, paperwork, business, events and travel.
        </T>

        {all.length ? (
          <>
            {groups.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[{ id: null as string | null, label: 'All' }, ...groups].map((g) => (
                  <Chip key={g.id ?? 'all'} label={g.label} selected={group === g.id} onPress={() => setGroup(g.id)} />
                ))}
              </ScrollView>
            ) : null}
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              SERVICE PARTNERS · MUSLIM-OWNED
            </T>
            {list.map((s) => (
              <PartnerCard key={s.id} shop={s} />
            ))}
            <T size={12} color={colors.muted}>
              {SERVICES_NOTE}
            </T>
          </>
        ) : (
          <Card style={{ gap: 12 }}>
            <T weight="bold" size={16}>
              Trusted businesses are joining soon, insha’Allah
            </T>
            <T size={13.5} color={colors.muted}>
              We’re partnering with Muslim-owned businesses near you.
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
          </Card>
        )}

        <T size={13} color={colors.muted}>
          {'Run a Muslim-owned business? '}
          <T size={13} weight="bold" color={colors.walnut} accessibilityRole="link" onPress={() => Linking.openURL('https://firdam.com/partners')}>
            Become a Firdam partner ↗
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
