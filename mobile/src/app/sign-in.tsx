import { router } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';

import { AuthShell, FormMessage } from '@/components/auth-shell';
import { Button, Field } from '@/components/ui';
import { friendlyAuthError, useAuth } from '@/lib/auth';
import { SocialSignIn } from '@/components/social-sign-in';
import { tr } from '@/lib/i18n';

export default function SignIn() {
  const { signIn, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const submit = async () => {
    setError(null);
    setNote(null);
    if (!email.trim() || !password) {
      setError(tr('Enter your email and password.'));
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      // The app moves on by itself: to the code screen or to Today.
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    setNote(null);
    if (!email.trim()) {
      setError(tr('Type your email above first, then tap “Forgot password?”.'));
      return;
    }
    try {
      await sendPasswordReset(email);
      setNote(tr('If that email has an account, a reset link is on its way.'));
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  };

  return (
    <AuthShell title={tr('Welcome back')} subtitle={tr('Sign in with the same account you use on firdam.com.')}>
      <SocialSignIn />
      <Field
        label={tr('Email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder={tr('you@example.com')}
      />
      <Field
        ref={passwordRef}
        label={tr('Password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <FormMessage text={error} />
      <FormMessage text={note} tone="success" />
      <Button label={tr('Sign in')} onPress={submit} busy={busy} />
      <Button label={tr('Forgot password?')} variant="text" onPress={forgot} />
      <Button label={tr('New to Firdam? Create an account')} variant="text" onPress={() => router.replace('/sign-up')} />
    </AuthShell>
  );
}
