import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { appleSignInAvailable, signInWithApple, signInWithGoogle } from '@/lib/social-auth';
import { colors } from '@/theme';

/** "Continue with Apple" (iPhone) and "Continue with Google", above the email form. */
export function SocialSignIn() {
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    appleSignInAvailable().then(setApple);
  }, []);

  const run = async (fn: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Could not sign in', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {apple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={16}
          style={{ height: 50 }}
          onPress={() => run(signInWithApple)}
        />
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => run(signInWithGoogle)} style={styles.google} disabled={busy}>
        <T weight="extrabold" size={17} color="#4285F4">
          G
        </T>
        <T weight="bold" size={15.5}>
          Continue with Google
        </T>
      </Pressable>
      <View style={styles.or}>
        <View style={styles.line} />
        <T size={12.5} color={colors.muted}>
          or with email
        </T>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  google: { height: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
});
