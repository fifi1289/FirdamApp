import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge, Chip } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import { usePartnerCountry } from '@/lib/partner-country';
import { recordPartnerClick } from '@/lib/partners';
import {
  ALL_COUNTRIES,
  PARTNER_NOTE,
  countryName,
  notReachLabel,
  partnerCountryOptions,
  partnerLinkLabel,
  partnerMeta,
  partnerReaches,
  partnersFor,
  partnersIn,
  reachLabel,
  telLink,
  worksLabel,
  type PartnerShop,
} from '@/shared/partners';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

export type WorksFilter = 'online' | 'in_person' | null;

/** Partners that can reach the country the family is viewing (all of them for "All countries"). */
export function useVisiblePartners(shops: PartnerShop[]): PartnerShop[] {
  const { viewing } = usePartnerCountry();
  return partnersFor(shops, viewing);
}

/** "Showing partners for": the family's country, the countries partners reach, or all. */
export function PartnerCountryPicker({ shops }: { shops: PartnerShop[] }) {
  const { home, viewing, setViewing } = usePartnerCountry();
  const options = partnerCountryOptions(shops, home);
  if (viewing && viewing !== ALL_COUNTRIES && !options.includes(viewing)) options.push(viewing);
  return (
    <View style={{ gap: 6 }}>
      <T size={12.5} color={colors.muted}>
        {tr('Showing partners for')}
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((c) => (
          <Chip key={c} label={`${tr(countryName(c))}${c === home ? ` ${tr('(you)')}` : ''}`} selected={viewing === c} onPress={() => setViewing(c)} />
        ))}
        <Chip label={tr('All countries')} selected={!viewing || viewing === ALL_COUNTRIES} onPress={() => setViewing(ALL_COUNTRIES)} />
      </ScrollView>
    </View>
  );
}

/** Country picker + All / Online / In person, for Services and Learning. */
export function PartnerFilters({ shops, works, onWorks }: { shops: PartnerShop[]; works: WorksFilter; onWorks: (w: WorksFilter) => void }) {
  const opts: { id: WorksFilter; label: string }[] = [
    { id: null, label: 'All' },
    { id: 'online', label: 'Online' },
    { id: 'in_person', label: 'In person' },
  ];
  return (
    <View style={{ gap: 10 }}>
      <PartnerCountryPicker shops={shops} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {opts.map((o) => (
          <Chip key={o.label} label={tr(o.label)} tone="sage" selected={works === o.id} onPress={() => onWorks(o.id)} />
        ))}
      </View>
    </View>
  );
}

/** Shown when no partner reaches the chosen country: never an empty page. */
export function NoPartnersHere({ what }: { what: string }) {
  const { viewing, setViewing } = usePartnerCountry();
  return (
    <Card style={{ gap: 8 }}>
      <T size={14}>{tr('No {0} reach {1} yet.', [tr(what), tr(countryName(viewing))])}</T>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Pressable accessibilityRole="button" onPress={() => setViewing(ALL_COUNTRIES)} hitSlop={8}>
          <T size={14} weight="bold" color={colors.walnut}>
            {tr('See all countries')}
          </T>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://firdam.com/partners').catch(() => {})} hitSlop={8}>
          <T size={14} weight="bold" color={colors.walnut}>
            {tr('Become a partner ↗')}
          </T>
        </Pressable>
      </View>
    </Card>
  );
}

/** Muslim-owned partner shops for one Shopping department, the same as on firdam.com. */
export function PartnerShops({ shops, department }: { shops: PartnerShop[]; department: string }) {
  const visible = useVisiblePartners(shops);
  const all = partnersIn(shops, department);
  const list = partnersIn(visible, department);
  if (!all.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        {tr('PARTNER SHOPS · MUSLIM-OWNED')}
      </T>
      <PartnerCountryPicker shops={shops} />
      {list.length ? list.map((s) => <PartnerCard key={s.id} shop={s} />) : <NoPartnersHere what={tr('partner shops')} />}
      <T size={12} color={colors.muted}>
        {tr(PARTNER_NOTE)}
      </T>
    </View>
  );
}

export function PartnerCard({ shop }: { shop: PartnerShop }) {
  const meta = partnerMeta(shop);
  const { home, viewing } = usePartnerCountry();
  const reach = [tr(worksLabel(shop.works)), reachLabel(shop, tr)].filter(Boolean).join(' · ');
  const outside = viewing === ALL_COUNTRIES && home && !partnerReaches(shop, home) ? notReachLabel(shop, home, tr) : '';
  const open = () => {
    recordPartnerClick(shop.id);
    Linking.openURL(shop.url).catch(() => {});
  };
  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.head}>
        {shop.image_url ? (
          <Image source={{ uri: shop.image_url }} style={styles.logo} accessibilityLabel={tr('{0} logo', [shop.name])} />
        ) : (
          <View style={[styles.logo, styles.initial]}>
            <T weight="bold" size={20}>
              {shop.name.charAt(0)}
            </T>
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <T weight="bold" size={16}>
              {shop.name}
            </T>
            <Badge label={tr('Partner')} tone="amber" />
          </View>
          {meta ? (
            <T size={12.5} color={colors.muted}>
              {meta}
            </T>
          ) : null}
          {reach ? (
            <T size={12.5} color={colors.muted}>
              {reach}
            </T>
          ) : null}
        </View>
      </View>
      {outside ? (
        <View style={styles.outside}>
          <T size={12} weight="bold" color={colors.walnut}>
            {outside}
          </T>
        </View>
      ) : null}

      {shop.description ? <T size={14}>{tr(shop.description)}</T> : null}
      {shop.how_to_order ? (
        <T size={13} color={colors.muted}>
          {shop.how_to_order}
        </T>
      ) : null}

      {shop.topics.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {shop.topics.map((t) => (
            <View key={t} style={styles.topic}>
              <T size={12} weight="semibold">
                {t}
              </T>
            </View>
          ))}
        </View>
      ) : null}

      {shop.photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {shop.photos.map((src) => (
            <Image key={src} source={{ uri: src }} style={styles.photo} accessibilityLabel={tr('From {0}', [shop.name])} />
          ))}
        </ScrollView>
      ) : null}

      {shop.discount_code ? (
        <View style={styles.code} accessible accessibilityLabel={tr('Discount code {0}{1}', [shop.discount_code, shop.discount_text ? `, ${shop.discount_text}` : ''])}>
          <T size={14} weight="bold" color={colors.walnut} selectable>
            {shop.discount_code}
          </T>
          <T size={12.5} color={colors.muted} style={{ flex: 1 }}>
            {shop.discount_text ?? tr('Use this code when you order')}
          </T>
        </View>
      ) : null}

      <Button label={`${partnerLinkLabel(shop.url)} ↗`} onPress={open} />
      {shop.phone ? (
        <Button
          label={tr('Call {0}', [shop.phone])}
          variant="secondary"
          onPress={() => {
            recordPartnerClick(shop.id);
            Linking.openURL(telLink(shop.phone!)).catch(() => {});
          }}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: colors.line },
  initial: { backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  outside: { alignSelf: 'flex-start', backgroundColor: colors.tint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  topic: { backgroundColor: colors.tint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  photo: { width: 120, height: 120, borderRadius: 12, backgroundColor: colors.tint },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});
