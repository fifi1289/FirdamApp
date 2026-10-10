import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AuthShell, FormMessage } from '@/components/auth-shell';
import { Button, Field, T } from '@/components/ui';
import { friendlyAuthError, useAuth } from '@/lib/auth';
import { WEBSITE } from '@/lib/config';
import { colors } from '@/theme';

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
      setError('Enter your first name and email.');
      return;
    }
    if (password.length < 8) {
      setError('Choose a password of at least 8 characters.');
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
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${email.trim()}. Tap it, then come back and sign in.`}>
        <Button label="Go to sign in" onPress={() => router.replace('/sign-in')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="One account for you and, later, your whole household.">
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" />
        </View>
      </View>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="At least 8 characters"
      />
      <FormMessage text={error} />
      <Button label="Create account" onPress={submit} busy={busy} />
      <T size={12.5} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
        By creating an account you confirm you are 18 or older and agree to Firdam’s Terms and Privacy Policy.
      </T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <Button label="Read the Terms" variant="text" onPress={() => Linking.openURL(`${WEBSITE}/terms`)} />
        <Button label="Privacy Policy" variant="text" onPress={() => Linking.openURL(`${WEBSITE}/privacy`)} />
      </View>
      <Button label="Already have an account? Sign in" variant="text" onPress={() => router.replace('/sign-in')} />
    </AuthShell>
  );
}
