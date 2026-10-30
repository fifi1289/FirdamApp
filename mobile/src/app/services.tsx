import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/kitchen-ui';
import { NoPartnersHere, PartnerCard, PartnerFilters, useVisiblePartners, type WorksFilter } from '@/components/partner-shops';
import { HomeButton } from '@/components/screen';
import { Card, T } from '@/components/ui';
import { usePartnerShops } from '@/lib/partners';
import { SERVICE_GROUPS, SERVICES_NOTE, matchesWorks, partnersIn, servicePartners, serviceTypeCounts } from '@/shared/partners';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

/** Services: trusted Muslim-owned local businesses families hire, by group and kind, the same as on firdam.com. */
export default function Services() {
  const allShops = usePartnerShops();
  const [works, setWorks] = useState<WorksFilter>(null);
  const shops = useVisiblePartners(allShops).filter((s) => matchesWorks(s, works));
  const hasAny = partnersIn(allShops, 'services').length > 0;
  const [group, setGroup] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const counts = serviceTypeCounts(shops);
  const current = SERVICE_GROUPS.find((g) => g.id === group) ?? null;
  const list = current ? servicePartners(shops, current.id, type) : [];

  const openGroup = (id: string | null) => {
    setGroup(id);
    setType(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {current ? tr(current.label) : tr('Services')}
        </T>
        {hasAny ? <PartnerFilters shops={allShops} works={works} onWorks={setWorks} /> : null}

        {!current ? (
          <>
            <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
              {tr('Trusted Muslim-owned businesses for your home, paperwork, business, events and travel.')}
            </T>
            {SERVICE_GROUPS.map((g) => {
              const n = servicePartners(shops, g.id).length;
              return (
                <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${tr(g.label)}, ${n || tr('none yet')}`} onPress={() => openGroup(g.id)}>
                  {({ pressed }) => (
                    <Card style={[{ gap: 4 }, pressed && { opacity: 0.8 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T weight="bold" size={16} style={{ flex: 1 }}>
                          {tr(g.label)}
                        </T>
                        <T size={12.5} color={colors.muted}>
                          {n ? `${n} ${n === 1 ? 'business' : 'businesses'}` : tr('Joining soon')}
                        </T>
                        <T size={18} color={colors.walnut}>
                          ›
                        </T>
                      </View>
                      <T size={13} color={colors.muted}>
                        {g.types.map((x) => tr(x)).join(' · ')}
                      </T>
                    </Card>
                  )}
                </Pressable>
              );
            })}
          </>
        ) : (
          <>
            <Pressable accessibilityRole="button" onPress={() => openGroup(null)} hitSlop={8}>
              <T size={14} weight="bold" color={colors.walnut}>
                {tr('‹ All services')}
              </T>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[null, ...current.types].map((t) => (
                <Chip key={t ?? 'all'} label={t ? (counts[t] ? `${tr(t)} ${counts[t]}` : tr(t)) : tr('All')} selected={type === t} onPress={() => setType(t)} />
              ))}
            </ScrollView>
            {list.length ? (
              <>
                {list.map((s) => (
                  <PartnerCard key={s.id} shop={s} />
                ))}
                <T size={12} color={colors.muted}>
                  {tr(SERVICES_NOTE)}
                </T>
              </>
            ) : servicePartners(allShops, current.id, type).length ? (
              <NoPartnersHere what={works ? (works === 'online' ? 'partners working online' : 'partners working in person') : 'partners'} />
            ) : (
              <Card style={{ gap: 4 }}>
                <T weight="bold" size={15}>
                  {tr('No {0} partners yet', [type ?? current.label.toLowerCase()])}
                </T>
                <T size={13.5} color={colors.muted}>
                  {tr('We’re inviting trusted Muslim-owned businesses, insha’Allah. Know a good one? Tell them about Firdam.')}
                </T>
              </Card>
            )}
          </>
        )}

        <T size={13} color={colors.muted}>
          {tr('Run a Muslim-owned business? ')}
          <T size={13} weight="bold" color={colors.walnut} accessibilityRole="link" onPress={() => Linking.openURL('https://firdam.com/partners')}>
            {tr('Become a Firdam partner ↗')}
          </T>
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
});
