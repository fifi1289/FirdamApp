import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AuthShell, FormMessage } from '@/components/auth-shell';
import { Button, Field, T } from '@/components/ui';
import { friendlyAuthError, useAuth } from '@/lib/auth';
import { WEBSITE } from '@/lib/config';
import { colors } from '@/theme';
import { SocialSignIn } from '@/components/social-sign-in';
import { tr } from '@/lib/i18n';

export default function SignUp() {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    if (!firstName.trim() || !email.trim()) {
      setError(tr('Enter your first name and email.'));
      return;
    }
    if (password.length < 8) {
      setError(tr('Choose a password of at least 8 characters.'));
      return;
    }
    setBusy(true);
    try {
      await signUp({ email, password, firstName, lastName });
      setSent(true);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title={tr('Check your email')} subtitle={tr('We sent a confirmation link to {0}. Tap it, then come back and sign in.', [email.trim()])}>
        <Button label={tr('Go to sign in')} onPress={() => router.replace('/sign-in')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title={tr('Create your account')} subtitle={tr('One account for you and, later, your whole household.')}>
      <SocialSignIn />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label={tr('First name')} value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={tr('Last name')} value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" />
        </View>
      </View>
      <Field
        label={tr('Email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder={tr('you@example.com')}
      />
      <Field
        label={tr('Password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder={tr('At least 8 characters')}
      />
      <FormMessage text={error} />
      <Button label={tr('Create account')} onPress={submit} busy={busy} />
      <T size={12.5} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
        {tr('By creating an account you confirm you are 18 or older and agree to Firdam’s Terms and Privacy Policy.')}
      </T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <Button label={tr('Read the Terms')} variant="text" onPress={() => Linking.openURL(`${WEBSITE}/terms`)} />
        <Button label={tr('Privacy Policy')} variant="text" onPress={() => Linking.openURL(`${WEBSITE}/privacy`)} />
      </View>
      <Button label={tr('Already have an account? Sign in')} variant="text" onPress={() => router.replace('/sign-in')} />
    </AuthShell>
  );
}
