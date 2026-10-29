import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/kitchen-ui';
import { Button, Card, T } from '@/components/ui';
import { recordPartnerClick } from '@/lib/partners';
import { PARTNER_NOTE, partnerLinkLabel, partnerMeta, partnersIn, telLink, type PartnerShop } from '@/shared/partners';
import { colors } from '@/theme';

/** Muslim-owned partner shops for one Shopping department, the same as on firdam.com. */
export function PartnerShops({ shops, department }: { shops: PartnerShop[]; department: string }) {
  const list = partnersIn(shops, department);
  if (!list.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        PARTNER SHOPS · MUSLIM-OWNED
      </T>
      {list.map((s) => (
        <PartnerCard key={s.id} shop={s} />
      ))}
      <T size={12} color={colors.muted}>
        {PARTNER_NOTE}
      </T>
    </View>
  );
}

export function PartnerCard({ shop }: { shop: PartnerShop }) {
  const meta = partnerMeta(shop);
  const open = () => {
    recordPartnerClick(shop.id);
    Linking.openURL(shop.url).catch(() => {});
  };
  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.head}>
        {shop.image_url ? (
          <Image source={{ uri: shop.image_url }} style={styles.logo} accessibilityLabel={`${shop.name} logo`} />
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
            <Badge label="Partner" tone="amber" />
          </View>
          {meta ? (
            <T size={12.5} color={colors.muted}>
              {meta}
            </T>
          ) : null}
        </View>
      </View>

      {shop.description ? <T size={14}>{shop.description}</T> : null}
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
            <Image key={src} source={{ uri: src }} style={styles.photo} accessibilityLabel={`From ${shop.name}`} />
          ))}
        </ScrollView>
      ) : null}

      {shop.discount_code ? (
        <View style={styles.code} accessible accessibilityLabel={`Discount code ${shop.discount_code}${shop.discount_text ? `, ${shop.discount_text}` : ''}`}>
          <T size={14} weight="bold" color={colors.walnut} selectable>
            {shop.discount_code}
          </T>
          <T size={12.5} color={colors.muted} style={{ flex: 1 }}>
            {shop.discount_text ?? 'Use this code when you order'}
          </T>
        </View>
      ) : null}

      <Button label={`${partnerLinkLabel(shop.url)} ↗`} onPress={open} />
      {shop.phone ? (
        <Button
          label={`Call ${shop.phone}`}
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
