import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { alertsAllowed } from './adhan-alerts';

const KIND = 'weekly-plan';

/**
 * Every Sunday at 5 pm: "Your plan for next week is ready". The plan itself is
 * made from the family's plan filters at the end of the week (kitchen-store).
 */
export async function scheduleWeeklyPlanReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { kind?: string } | undefined)?.kind === KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!(await alertsAllowed())) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(KIND, { name: 'Weekly meal plan', importance: Notifications.AndroidImportance.DEFAULT });
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your plan for next week is ready',
      body: 'Halal meals for the whole family, sized for your home. Tap to see it and swap anything you like.',
      data: { kind: KIND, url: '/kitchen' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 17,
      minute: 0,
      ...(Platform.OS === 'android' ? { channelId: KIND } : {}),
    },
  });
}

/** Opens Kitchen when the weekly plan notification is tapped. */
export function isWeeklyPlanTap(response: Notifications.NotificationResponse | null): boolean {
  return (response?.notification.request.content.data as { kind?: string } | undefined)?.kind === KIND;
}
