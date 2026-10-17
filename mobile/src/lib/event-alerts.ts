import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { alertsAllowed } from './adhan-alerts';
import { getFastingOptions, getRemindersOn, loadEvents, loadHijriMonth } from './calendar';
import { buildCalendarItems, formatTime, parseISODate, type HijriLabel } from '@/shared/calendar-core';

const KIND = 'family-event';
/** iPhones keep at most 64 scheduled alerts; adhan alerts use up to 35, so events get the next 20. */
const MAX_ALERTS = 20;
const DAYS_AHEAD = 30;

async function clearEventAlerts() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { kind?: string } | undefined)?.kind === KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function at(date: string, hour: number, minute = 0, dayOffset = 0): Date {
  const d = parseISODate(date);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Replaces the scheduled family-calendar reminders with the next month's:
 * the evening before (7 pm) and, for timed events, an hour before; all-day
 * events on the morning itself (8 am). Sunnah fasts the family chose get a
 * reminder the evening before, for suhoor. Safe to call often.
 */
export async function scheduleEventAlerts(): Promise<number> {
  await clearEventAlerts();
  if (!(await getRemindersOn()) || !(await alertsAllowed())) return 0;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + DAYS_AHEAD);

  const [events, fasting] = await Promise.all([loadEvents(), getFastingOptions()]);
  // Hijri dates are only needed for Sunnah fasts.
  const hijri = new Map<string, HijriLabel>();
  if (fasting.sunnahFasts || fasting.mondaysThursdays) {
    for (const m of [start, end]) {
      const month = await loadHijriMonth(m.getFullYear(), m.getMonth() + 1).catch(() => new Map<string, HijriLabel>());
      month.forEach((v, k) => hijri.set(k, v));
    }
  }
  const items = buildCalendarItems(events, [], hijri, start, end, fasting).filter((i) => i.source === 'event' || i.source === 'fasting');

  const now = new Date();
  const alerts: { when: Date; title: string; body: string }[] = [];
  for (const it of items) {
    if (it.source === 'fasting') {
      alerts.push({ when: at(it.date, 20, 0, -1), title: `Tomorrow: ${it.title}`, body: 'Set your suhoor alarm. May Allah accept it.' });
      continue;
    }
    const time = formatTime(it.startTime);
    alerts.push({ when: at(it.date, 19, 0, -1), title: `Tomorrow: ${it.title}`, body: time ? `At ${time}${it.location ? ` · ${it.location}` : ''}` : 'From your family calendar' });
    if (it.startTime) {
      const [h, m] = it.startTime.split(':').map(Number);
      const startAt = at(it.date, h ?? 9, m ?? 0);
      alerts.push({ when: new Date(startAt.getTime() - 60 * 60_000), title: `In an hour: ${it.title}`, body: it.location ? `At ${it.location}` : `At ${time}` });
    } else {
      alerts.push({ when: at(it.date, 8), title: `Today: ${it.title}`, body: 'From your family calendar' });
    }
  }

  const upcoming = alerts.filter((a) => a.when > now).sort((a, b) => a.when.getTime() - b.when.getTime()).slice(0, MAX_ALERTS);
  if (upcoming.length && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(KIND, { name: 'Family calendar', importance: Notifications.AndroidImportance.DEFAULT });
  }
  for (const a of upcoming) {
    await Notifications.scheduleNotificationAsync({
      content: { title: a.title, body: a.body, data: { kind: KIND, url: '/calendar' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.when, ...(Platform.OS === 'android' ? { channelId: KIND } : {}) },
    });
  }
  return upcoming.length;
}

/** Opens the Calendar when a family-event reminder is tapped. */
export function isEventAlertTap(response: Notifications.NotificationResponse | null): boolean {
  return (response?.notification.request.content.data as { kind?: string } | undefined)?.kind === KIND;
}
