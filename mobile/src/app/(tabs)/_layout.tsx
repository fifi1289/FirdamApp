import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { scheduleAdhanAlerts } from '@/lib/adhan-alerts';
import { eventAlertTarget, scheduleEventAlerts } from '@/lib/event-alerts';
import { loadPrayerSettings, usePrayerSettings } from '@/lib/prayer';
import { isWeeklyPlanTap, scheduleWeeklyPlanReminder } from '@/lib/weekly-plan-alert';
import { refreshRecipeTranslations } from '@/lib/recipe-i18n';
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

/** Family-calendar reminders: refreshed on open and on return; tapping one opens the Calendar. */
function useEventAlerts() {
  useEffect(() => {
    scheduleEventAlerts().catch(() => {});
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleEventAlerts().catch(() => {});
    });
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        const to = eventAlertTarget(r);
        if (to) router.push(to);
      })
      .catch(() => {});
    const tap = Notifications.addNotificationResponseReceivedListener((r) => {
      const to = eventAlertTarget(r);
      if (to) router.push(to);
    });
    return () => {
      app.remove();
      tap.remove();
    };
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
  useEffect(() => {
    refreshRecipeTranslations().catch(() => {});
  }, []);
  useAdhanAlerts();
  useWeeklyPlanReminder();
  useEventAlerts();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.linen } }} />;
}
