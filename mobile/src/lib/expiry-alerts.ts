import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { alertsAllowed } from './adhan-alerts';
import type { PantryItem } from './db-types';
import { tr } from '@/lib/i18n';
import { whoAvoids } from '@/shared/allergens';
import type { Household } from '@/shared/pantry-portions';
import { effectiveExpiry } from '@/shared/kitchen-items';

const KIND = 'pantry-expiry';
const ON_KEY = 'firdam.notify.expiry';
/** Reminders go out at 9 am, two days and one day before the date. */
const HOUR = 9;
const DAYS_BEFORE = [2, 1] as const;
/** Phones keep a limited number of scheduled alerts; one per day is plenty. */
const MAX_DAYS = 30;

/** Expiry reminders are on unless the family turned them off. */
export async function getExpiryAlertsOn(): Promise<boolean> {
  return (await AsyncStorage.getItem(ON_KEY).catch(() => null)) !== 'off';
}

export async function setExpiryAlertsOn(on: boolean): Promise<void> {
  await AsyncStorage.setItem(ON_KEY, on ? 'on' : 'off').catch(() => {});
}

function list(names: string[]): string {
  const shown = names.slice(0, 4).map((n) => tr(n));
  return names.length > 4 ? `${shown.join(tr(', '))}${tr(', ')}+${names.length - 4}` : shown.join(tr(', '));
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Re-plans the reminders shortly after the pantry or the allergies change. */
export function rescheduleExpiryAlerts(pantry: PantryItem[], allergies: string[], household: Household | null): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    scheduleExpiryAlerts(pantry, allergies, household).catch(() => {});
  }, 1500);
}

/**
 * One notification per day, at 9 am, for food that expires in 2 days or tomorrow:
 * "Use within 2 days: eggs, tomatoes". Food the family is allergic to gets
 * "give it away" instead of recipes, since no recipe with it would be safe.
 */
export async function scheduleExpiryAlerts(pantry: PantryItem[], allergies: string[], household: Household | null): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { kind?: string } | undefined)?.kind === KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!(await alertsAllowed()) || !(await getExpiryAlertsOn())) return;

  const now = Date.now();
  const days = new Map<string, { when: Date; soon: Map<number, string[]>; avoid: string[]; some: Map<string, string[]> }>();
  for (const item of pantry) {
    if (item.tracking === 'level') continue;
    const { date } = effectiveExpiry(item);
    if (!date) continue;
    const who = whoAvoids(item.name, allergies, household?.members ?? [], household?.people ?? 1);
    for (const before of DAYS_BEFORE) {
      const when = new Date(`${date}T00:00:00`);
      when.setDate(when.getDate() - before);
      when.setHours(HOUR, 0, 0, 0);
      if (when.getTime() <= now || when.getTime() > now + MAX_DAYS * 86_400_000) continue;
      const key = when.toDateString();
      const day = days.get(key) ?? { when, soon: new Map<number, string[]>(), avoid: [], some: new Map<string, string[]>() };
      if (who.everyone) {
        if (!day.avoid.includes(item.name)) day.avoid.push(item.name);
      } else {
        day.soon.set(before, [...(day.soon.get(before) ?? []), item.name]);
        // Food only some of the family avoids: say who, so their portion is kept separate.
        if (who.names.length) {
          const names = who.names.join(tr(' and '));
          if (!(day.some.get(names) ?? []).includes(item.name)) day.some.set(names, [...(day.some.get(names) ?? []), item.name]);
        }
      }
      days.set(key, day);
    }
  }
  if (!days.size) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(KIND, { name: 'Food to use soon', importance: Notifications.AndroidImportance.DEFAULT });
  }
  for (const day of [...days.values()].sort((a, b) => a.when.getTime() - b.when.getTime())) {
    const lines: string[] = [];
    const tomorrow = day.soon.get(1);
    const twoDays = day.soon.get(2);
    if (tomorrow?.length) lines.push(tr('Use by tomorrow: {0}.', [list(tomorrow)]));
    if (twoDays?.length) lines.push(tr('Use within 2 days: {0}.', [list(twoDays)]));
    for (const [names, foods] of day.some) lines.push(tr('Not for {0}: {1}.', [names, list(foods)]));
    if (day.avoid.length) lines.push(tr('Your family avoids {0}: give it to a neighbour or a food bank before it goes to waste.', [list(day.avoid)]));
    await Notifications.scheduleNotificationAsync({
      content: {
        title: tr('Food to use soon'),
        body: lines.join('\n'),
        data: { kind: KIND },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: day.when,
        ...(Platform.OS === 'android' ? { channelId: KIND } : {}),
      },
    });
  }
}

/** Tapping an expiry reminder opens the pantry. */
export function isExpiryTap(response: Notifications.NotificationResponse | null): boolean {
  return (response?.notification.request.content.data as { kind?: string } | undefined)?.kind === KIND;
}
