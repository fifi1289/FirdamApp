import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/art';
import { FEATURE_ICONS } from '@/components/feature-ring';
import { HomeButton } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { useFavourites } from '@/lib/home-favourites';
import { showAlert } from '@/components/firdam-alert';
import { tr } from '@/lib/i18n';
import { HOME_FEATURES, HOME_FEATURE_GROUPS, MAX_FAVOURITES, type HomeFeatureId } from '@/shared/home-features';
import { colors } from '@/theme';

/**
 * Every Firdam feature in one place. With ?edit=1 the family picks the
 * 5 favourites shown around the prayer on Home.
 */
export default function Features() {
  const params = useLocalSearchParams<{ edit?: string }>();
  const { favourites, save } = useFavourites();
  const [editing, setEditing] = useState(params.edit === '1');
  const [picked, setPicked] = useState<HomeFeatureId[]>(favourites);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setPicked(favourites), [favourites]);

  // Each tap is saved straight away, so going back to Home never loses a choice.
  const toggle = (id: HomeFeatureId) => {
    setNote(null);
    if (id === 'prayer') {
      showAlert(tr('Prayer is always on Home'), tr('The next prayer sits in the middle of your ring, so it doesn’t need a place around it.'));
      return;
    }
    let next: HomeFeatureId[];
    if (picked.includes(id)) next = picked.filter((x) => x !== id);
    else if (picked.length >= MAX_FAVOURITES) {
      showAlert(tr('Your Home ring is full'), tr('You can keep {0} favourites around the prayer. Untick one first; everything else stays one tap away under More in Firdam.', [MAX_FAVOURITES]));
      return;
    } else next = [...picked, id];
    setPicked(next);
    void save(next);
  };

  const done = () => {
    if (params.edit === '1') router.back();
    else setEditing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {editing ? tr('Your favourites') : tr('All features')}
        </T>
        <T size={14.5} color={colors.muted}>
          {editing
            ? tr('Choose up to {0}. They sit around the prayer on Home. {1} of {0} chosen.', [MAX_FAVOURITES, picked.length])
            : tr('Everything in Firdam. Tap Edit favourites to choose what shows on Home.')}
        </T>

        {HOME_FEATURE_GROUPS.map((g) => (
          <View key={g} style={{ gap: 8 }}>
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              {tr(g).toUpperCase()}
            </T>
            <View style={styles.grid}>
              {HOME_FEATURES.filter((f) => f.group === g).map((f) => {
                const fixed = f.id === 'prayer';
                const on = fixed || picked.includes(f.id);
                return (
                  <Pressable
                    key={f.id}
                    accessibilityRole={editing ? 'checkbox' : 'button'}
                    accessibilityState={editing ? { checked: on } : undefined}
                    accessibilityLabel={tr(f.label)}
                    onPress={() => (editing ? toggle(f.id) : router.push(f.app as Href))}
                    style={({ pressed }) => [styles.tile, editing && on && styles.tileOn, pressed && { opacity: 0.85 }]}
                  >
                    <View style={[styles.icon, editing && on && { backgroundColor: colors.walnut }]}>
                      <Icon name={FEATURE_ICONS[f.id]} size={22} color={editing && on ? colors.linen : colors.walnut} />
                    </View>
                    <T size={13} weight="bold" numberOfLines={2} style={{ textAlign: 'center' }}>
                      {tr(f.label)}
                    </T>
                    {editing && fixed ? (
                      <T size={11} color={colors.muted} style={{ textAlign: 'center', marginTop: -4 }}>
                        {tr('Always in the middle')}
                      </T>
                    ) : null}
                    {editing ? (
                      <View style={[styles.check, on && styles.checkOn]}>{on ? <T size={11} weight="bold" color={colors.linen}>✓</T> : null}</View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {note ? (
          <T size={13.5} color={colors.brickText}>
            {note}
          </T>
        ) : null}
        {editing ? (
          <Button label={tr('Done')} onPress={done} />
        ) : (
          <Button label={tr('Edit favourites')} variant="secondary" onPress={() => setEditing(true)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tileOn: { borderColor: colors.walnut, borderWidth: 2 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.walnut, borderColor: colors.walnut },
});
