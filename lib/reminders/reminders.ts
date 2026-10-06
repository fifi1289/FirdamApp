'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Browser reminders. These fire while Firdam is open in a browser tab
 * (no push server is involved), using the Notification API.
 */

export interface ReminderSettings {
  prayers: boolean;
  /** Minutes before each prayer. 0 = at prayer time. */
  prayerLeadMinutes: number;
  events: boolean;
}

const KEY = 'firdam.reminders';
const EVENT = 'firdam-reminders-changed';
export const DEFAULT_REMINDERS: ReminderSettings = { prayers: false, prayerLeadMinutes: 10, events: false };

function read(): ReminderSettings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_REMINDERS;
    return { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function useReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setSettings(read());
    setPermission(notificationsSupported() ? Notification.permission : 'unsupported');
    const sync = () => setSettings(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const update = useCallback(async (next: ReminderSettings) => {
    const wantsAny = next.prayers || next.events;
    if (wantsAny && notificationsSupported() && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        next = { ...next, prayers: false, events: false };
      }
    }
    setSettings(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // ignore
    }
  }, []);

  return { settings, permission, update };
}

/** Shows a notification once per tag (deduplicated across reloads for the day). */
export function notifyOnce(tag: string, title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const seenKey = `firdam.notified.${tag}`;
  try {
    if (window.localStorage.getItem(seenKey)) return;
    window.localStorage.setItem(seenKey, '1');
  } catch {
    // ignore
  }
  try {
    new Notification(title, { body, tag, icon: '/images/logo.png' });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}
