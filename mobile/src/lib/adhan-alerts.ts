import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { PRAYERS, formatTime, timesFor, type PrayerSettings } from './prayer';

const KIND = 'adhan';
/** iPhones keep at most 64 scheduled alerts, so plan a week ahead and top up on each open. */
const DAYS_AHEAD = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function alertsAllowed(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Asks once for permission to show prayer alerts. */
export async function askForAlerts(): Promise<boolean> {
  if (await alertsAllowed()) return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function clearAdhanAlerts() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { kind?: string } | undefined)?.kind === KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Replaces the scheduled adhan alerts with the next week's, following the
 * current settings. Safe to call often (on every app open and settings change).
 */
export async function scheduleAdhanAlerts(settings: PrayerSettings): Promise<number> {
  await clearAdhanAlerts();
  if (!settings.place || !(await alertsAllowed())) return 0;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(KIND, {
      name: 'Prayer times',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const now = new Date();
  let count = 0;
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    const { times } = timesFor(settings, settings.place, day);
    for (const p of PRAYERS) {
      if (!p.alert || !settings.alerts[p.id]) continue;
      const at = times[p.id];
      if (at <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${p.name} · ${formatTime(at)}`,
          body: `It's time for ${p.name}${settings.place.label !== 'Your location' ? ` in ${settings.place.label}` : ''}.`,
          sound: 'default',
          data: { kind: KIND, prayer: p.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          ...(Platform.OS === 'android' ? { channelId: KIND } : {}),
        },
      });
      count++;
    }
  }
  return count;
}
