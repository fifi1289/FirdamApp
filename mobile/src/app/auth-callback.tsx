import { Redirect } from 'expo-router';

/** Google sign-in returns here; the sign-in itself finishes in social-auth. */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
