import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/art';
import { Button, T } from '@/components/ui';
import { colors } from '@/theme';

export interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}
interface AlertRequest {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let show: ((a: AlertRequest) => void) | null = null;
const queue: AlertRequest[] = [];

/**
 * Firdam's own pop-up, used instead of the phone's plain system alert.
 * Same shape as React Native's Alert.alert(title, message, buttons).
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const req = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  if (show) show(req);
  else queue.push(req);
}

/** Mounted once at the root of the app. */
export function FirdamAlertHost() {
  const [current, setCurrent] = useState<AlertRequest | null>(null);
  useEffect(() => {
    show = (a) => setCurrent((cur) => (cur ? (queue.push(a), cur) : a));
    const next = queue.shift();
    if (next) setCurrent(next);
    return () => {
      show = null;
    };
  }, []);

  const close = (b?: AlertButton) => {
    setCurrent(queue.shift() ?? null);
    // Let this sheet finish closing first (iPhone can't open the camera or
    // another sheet while one is still on screen).
    if (b?.onPress) setTimeout(b.onPress, 350);
  };

  if (!current) return null;
  const cancel = current.buttons.find((b) => b.style === 'cancel');
  const actions = current.buttons.filter((b) => b.style !== 'cancel');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close(cancel)}>
      <Pressable style={styles.backdrop} onPress={() => close(cancel)} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.brand}>
            <Logo size={34} />
          </View>
          <T weight="extrabold" size={19} style={{ textAlign: 'center' }} accessibilityRole="header">
            {current.title}
          </T>
          {current.message ? (
            <T size={14.5} color="#5F5048" style={{ textAlign: 'center', lineHeight: 21 }}>
              {current.message}
            </T>
          ) : null}
          <View style={{ gap: 8, marginTop: 6, alignSelf: 'stretch' }}>
            {actions.map((b, i) => (
              <Button
                key={`${b.text}-${i}`}
                label={b.text ?? 'OK'}
                variant={i === 0 && b.style !== 'destructive' ? 'primary' : 'secondary'}
                onPress={() => close(b)}
                style={b.style === 'destructive' ? { borderColor: colors.brickText } : undefined}
              />
            ))}
            {cancel ? <Button label={cancel.text ?? 'Cancel'} variant="text" onPress={() => close(cancel)} /> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(40,28,20,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.linen, borderRadius: 28, padding: 22, paddingTop: 18, gap: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  brand: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 1, borderColor: colors.line },
});
