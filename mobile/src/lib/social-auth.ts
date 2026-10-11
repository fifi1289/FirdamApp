import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/** Sign in with Apple is offered on iPhone (Apple requires it next to Google sign-in). */
export async function appleSignInAvailable(): Promise<boolean> {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync().catch(() => false));
}

/** Native Sign in with Apple, then a Supabase session from Apple's identity token. */
export async function signInWithApple(): Promise<boolean> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken) throw new Error('Apple did not return a sign-in token.');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
    if (error) throw error;
    // Apple shares the name only on the very first sign-in: keep it.
    const first = credential.fullName?.givenName;
    if (first) await supabase.auth.updateUser({ data: { first_name: first, last_name: credential.fullName?.familyName ?? '' } });
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
}

/** Google through Supabase in the system browser, back to the app with a one-time code. */
export async function signInWithGoogle(): Promise<boolean> {
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('Google sign-in is not available right now.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  const problem = url.searchParams.get('error_description');
  if (problem) throw new Error(problem);
  if (!code) throw new Error('Google sign-in did not finish. Please try again.');
  const { error: exchange } = await supabase.auth.exchangeCodeForSession(code);
  if (exchange) throw exchange;
  return true;
}
