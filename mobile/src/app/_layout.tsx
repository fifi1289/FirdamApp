import { Amiri_400Regular } from '@expo-google-fonts/amiri';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { BrandSplash } from '@/components/brand-splash';
import { FirdamAlertHost } from '@/components/firdam-alert';

import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { loading, session, needsCode } = useAuth();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Amiri_400Regular,
  });
  // Keep the logo and slogan on screen for a moment, even on a fast start.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1400);
    return () => clearTimeout(t);
  }, []);
  const ready = fontsLoaded && !loading && shown;

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  if (!ready) return <BrandSplash />;

  const signedIn = !!session;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.linen } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && needsCode}>
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !needsCode}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="prayer-settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal-preferences" options={{ presentation: 'modal' }} />
        <Stack.Screen name="family-members" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="meal" />
        <Stack.Screen name="finance" />
        <Stack.Screen name="qibla" />
        <Stack.Screen name="calendar" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Navigator />
      <FirdamAlertHost />
    </AuthProvider>
  );
}
