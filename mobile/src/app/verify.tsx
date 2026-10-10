import { useState } from 'react';

import { AuthShell, FormMessage } from '@/components/auth-shell';
import { Button, Field } from '@/components/ui';
import { friendlyAuthError, useAuth } from '@/lib/auth';

/** Shown after the password when two-step verification is on. */
export default function Verify() {
  const { verifyCode, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await verifyCode(clean);
    } catch (e) {
      setError(friendlyAuthError(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell canGoBack={false} title="Enter your code" subtitle="Two-step verification is on. Open your authenticator app and enter the 6-digit code for Firdam.">
      <Field
        label="6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={7}
        autoFocus
        onSubmitEditing={submit}
        style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
      />
      <FormMessage text={error} />
      <Button label="Verify" onPress={submit} busy={busy} />
      <Button label="Use a different account" variant="text" onPress={signOut} />
    </AuthShell>
  );
}
