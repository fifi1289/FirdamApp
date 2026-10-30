import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/kitchen-ui';
import { Card, T } from '@/components/ui';
import { LANGUAGES, tr, useLanguage, type Lang } from '@/lib/i18n';
import { colors } from '@/theme';

/** Language choice in the Family tab: every screen redraws in the new language. */
export function LanguageCard() {
  const { lang, setLang } = useLanguage();
  return (
    <Card style={{ gap: 10 }}>
      <T weight="bold" size={15}>
        {tr('Language')}
      </T>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {LANGUAGES.map((l) => (
          <Chip key={l.id} label={l.label} selected={lang === l.id} onPress={() => setLang(l.id)} />
        ))}
      </View>
      <T size={12.5} color={colors.muted}>
        {tr('Duas and hadith meanings stay in English for now; Arabic and transliteration are always shown.')}
      </T>
    </Card>
  );
}

/** Small EN / FR switch for the welcome screen, before signing in. */
export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel={tr('Language')}>
      {LANGUAGES.map((l) => {
        const on = lang === l.id;
        return (
          <Pressable
            key={l.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l.label}
            onPress={() => setLang(l.id as Lang)}
            style={[styles.option, on && styles.on]}
            hitSlop={6}
          >
            <T size={12.5} weight="bold" color={on ? colors.linen : colors.espresso}>
              {l.id.toUpperCase()}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', borderWidth: 1, borderColor: colors.sand, borderRadius: 999, padding: 3, gap: 2 },
  option: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  on: { backgroundColor: colors.espresso },
});
