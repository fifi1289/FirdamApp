import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/kitchen-ui';
import { PartnerCard } from '@/components/partner-shops';
import { HomeButton } from '@/components/screen';
import { Card, T } from '@/components/ui';
import { usePartnerShops } from '@/lib/partners';
import { SERVICE_GROUPS, SERVICES_NOTE, servicePartners, serviceTypeCounts } from '@/shared/partners';
import { colors } from '@/theme';

/** Services: trusted Muslim-owned local businesses families hire, by group and kind, the same as on firdam.com. */
export default function Services() {
  const shops = usePartnerShops();
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
          {current ? current.label : 'Services'}
        </T>

        {!current ? (
          <>
            <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
              Trusted Muslim-owned businesses for your home, paperwork, business, events and travel.
            </T>
            {SERVICE_GROUPS.map((g) => {
              const n = servicePartners(shops, g.id).length;
              return (
                <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${g.label}, ${n || 'none yet'}`} onPress={() => openGroup(g.id)}>
                  {({ pressed }) => (
                    <Card style={[{ gap: 4 }, pressed && { opacity: 0.8 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T weight="bold" size={16} style={{ flex: 1 }}>
                          {g.label}
                        </T>
                        <T size={12.5} color={colors.muted}>
                          {n ? `${n} ${n === 1 ? 'business' : 'businesses'}` : 'Joining soon'}
                        </T>
                        <T size={18} color={colors.walnut}>
                          ›
                        </T>
                      </View>
                      <T size={13} color={colors.muted}>
                        {g.types.join(' · ')}
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
                ‹ All services
              </T>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[null, ...current.types].map((t) => (
                <Chip key={t ?? 'all'} label={t ? (counts[t] ? `${t} ${counts[t]}` : t) : 'All'} selected={type === t} onPress={() => setType(t)} />
              ))}
            </ScrollView>
            {list.length ? (
              <>
                {list.map((s) => (
                  <PartnerCard key={s.id} shop={s} />
                ))}
                <T size={12} color={colors.muted}>
                  {SERVICES_NOTE}
                </T>
              </>
            ) : (
              <Card style={{ gap: 4 }}>
                <T weight="bold" size={15}>
                  {`No ${type ?? current.label.toLowerCase()} partners yet`}
                </T>
                <T size={13.5} color={colors.muted}>
                  We’re inviting trusted Muslim-owned businesses, insha’Allah. Know a good one? Tell them about Firdam.
                </T>
              </Card>
            )}
          </>
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
});
