import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { alertsAllowed } from './adhan-alerts';
import { getRemindersOn, loadEvents } from './calendar';
import { getFastingPrefs, upcomingFasts } from './fasting';
import { loadMakeup } from './makeup';
import { makeupReminderDates } from '@/shared/makeup-core';
import { buildCalendarItems, formatTime, parseISODate, type FastingDay } from '@/shared/calendar-core';

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
 * reminder at 8 pm the evening before, for suhoor. Days left to make up get a
 * reminder a month and a week before the next Ramadan. Safe to call often.
 */
export async function scheduleEventAlerts(): Promise<number> {
  await clearEventAlerts();
  if (!(await alertsAllowed())) return 0;
  const [eventsOn, fasting, makeup] = await Promise.all([getRemindersOn(), getFastingPrefs(), loadMakeup().catch(() => [])]);
  // Days to make up: a month and a week before the next Ramadan, while any are left.
  const makeupAlerts = makeupReminderDates(makeup).map((r) => ({
    when: r.when,
    title: `${r.left} ${r.left === 1 ? 'fast' : 'fasts'} to make up before Ramadan`,
    body: r.daysBefore === 30 ? 'Ramadan starts in about a month. Plan your make-up fasts, in sha Allah.' : 'Ramadan starts in a week. Log each day in Fasting as you make it up.',
    url: '/fasting',
  }));
  if (!eventsOn && !fasting.remind && !makeupAlerts.length) return 0;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + DAYS_AHEAD);

  const items = eventsOn ? buildCalendarItems(await loadEvents(), [], new Map(), start, end).filter((i) => i.source === 'event') : [];
  const fasts: FastingDay[] = fasting.remind ? await upcomingFasts(fasting, DAYS_AHEAD).catch(() => []) : [];

  const now = new Date();
  const alerts: { when: Date; title: string; body: string; url?: string }[] = [];
  for (const f of fasts) {
    alerts.push({ when: at(f.date, 20, 0, -1), title: `Fast tomorrow: ${f.title}`, body: 'Remember your suhoor. May Allah accept it from you.', url: '/fasting' });
  }
  for (const it of items) {
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

  const upcoming = [
    ...makeupAlerts,
    ...alerts.filter((a) => a.when > now).sort((a, b) => a.when.getTime() - b.when.getTime()).slice(0, MAX_ALERTS - makeupAlerts.length),
  ];
  if (upcoming.length && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(KIND, { name: 'Family calendar', importance: Notifications.AndroidImportance.DEFAULT });
  }
  for (const a of upcoming) {
    await Notifications.scheduleNotificationAsync({
      content: { title: a.title, body: a.body, data: { kind: KIND, url: a.url ?? '/calendar' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.when, ...(Platform.OS === 'android' ? { channelId: KIND } : {}) },
    });
  }
  return upcoming.length;
}

/** Where a tapped calendar or fasting reminder should open (null for other notifications). */
export function eventAlertTarget(response: Notifications.NotificationResponse | null): '/calendar' | '/fasting' | null {
  const data = response?.notification.request.content.data as { kind?: string; url?: string } | undefined;
  if (data?.kind !== KIND) return null;
  return data.url === '/fasting' ? '/fasting' : '/calendar';
}
