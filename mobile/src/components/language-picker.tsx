import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { LANGUAGES, tr, useLanguage, type Lang } from '@/lib/i18n';
import { colors } from '@/theme';

/** Small EN / FR / AR switch for the welcome screen, before signing in. */
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
  button: { minWidth: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(59,42,36,0.35)', justifyContent: 'center', padding: 28 },
  sheet: { backgroundColor: colors.linen, borderRadius: 20, padding: 20, gap: 8 },
  row: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.sand, justifyContent: 'center', paddingHorizontal: 16 },
  rowOn: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  toggle: { flexDirection: 'row', borderWidth: 1, borderColor: colors.sand, borderRadius: 999, padding: 3, gap: 2 },
  option: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  on: { backgroundColor: colors.espresso },
});

const SHORT: Record<Lang, string> = { en: 'EN', fr: 'FR', ar: 'ع' };

/** Language button at the top of Home: shows the current language, tap to pick another. */
export function LanguageButton() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('Language')}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={styles.button}
      >
        <T size={13} weight="bold" color={colors.walnut}>
          {SHORT[lang]}
        </T>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={tr('Close')}>
          <View style={styles.sheet} accessibilityRole="radiogroup">
            <T weight="bold" size={16} style={{ marginBottom: 6 }}>
              {tr('Language')}
            </T>
            {LANGUAGES.map((l) => {
              const on = lang === l.id;
              return (
                <Pressable
                  key={l.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setOpen(false);
                    if (!on) setLang(l.id);
                  }}
                  style={[styles.row, on && styles.rowOn]}
                >
                  <T size={16} weight={on ? 'bold' : 'semibold'} color={on ? colors.linen : colors.espresso}>
                    {l.label}
                  </T>
                </Pressable>
              );
            })}
            <T size={12} color={colors.muted} style={{ marginTop: 6 }}>
              {tr('Duas and hadith meanings stay in English for now; Arabic and transliteration are always shown.')}
            </T>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
