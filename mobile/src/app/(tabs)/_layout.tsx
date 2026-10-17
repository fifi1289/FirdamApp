import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { scheduleAdhanAlerts } from '@/lib/adhan-alerts';
import { loadPrayerSettings, usePrayerSettings } from '@/lib/prayer';
import { isWeeklyPlanTap, scheduleWeeklyPlanReminder } from '@/lib/weekly-plan-alert';
import { colors } from '@/theme';

/** Keeps a week of adhan alerts scheduled: on open, on return to the app, and when settings change. */
function useAdhanAlerts() {
  const { settings } = usePrayerSettings();
  useEffect(() => {
    if (settings) scheduleAdhanAlerts(settings).catch(() => {});
  }, [settings]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadPrayerSettings().then((s) => scheduleAdhanAlerts(s)).catch(() => {});
    });
    return () => sub.remove();
  }, []);
}

/** Sunday's "your plan for next week is ready" reminder; tapping it opens Kitchen. */
function useWeeklyPlanReminder() {
  useEffect(() => {
    scheduleWeeklyPlanReminder().catch(() => {});
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (isWeeklyPlanTap(r)) router.push('/kitchen');
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      if (isWeeklyPlanTap(r)) router.push('/kitchen');
    });
    return () => sub.remove();
  }, []);
}

/** Home (the ring) is always the screen underneath. */
export const unstable_settings = { initialRouteName: 'index' };

/**
 * Home is the ring of features; each feature opens on top of it and the Home
 * button (or a swipe back) returns to the ring. No bottom tab bar.
 */
export default function FeaturesLayout() {
  useAdhanAlerts();
  useWeeklyPlanReminder();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.linen } }} />;
}
