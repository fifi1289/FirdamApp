import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeButton } from '@/components/screen';
import { SwitchRow } from '@/components/switch-row';
import { Button, Card, T } from '@/components/ui';
import { askForAlerts } from '@/lib/adhan-alerts';
import { getRemindersOn, setRemindersOn } from '@/lib/calendar';
import { scheduleEventAlerts } from '@/lib/event-alerts';
import { getFastingPrefs, setFastingPrefs, type FastingPrefs } from '@/lib/fasting';
import { PRAYERS, usePrayerSettings, type PrayerId } from '@/lib/prayer';
import { getWeeklyPlanOn, scheduleWeeklyPlanReminder, setWeeklyPlanOn } from '@/lib/weekly-plan-alert';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

/** Every reminder Firdam sends, in one place, each with its own switch. */
export default function NotificationsScreen() {
  const { settings, update } = usePrayerSettings();
  const [permission, setPermission] = useState<'granted' | 'undetermined' | 'denied' | null>(null);
  const [events, setEvents] = useState(true);
  const [fasting, setFasting] = useState<FastingPrefs | null>(null);
  const [weekly, setWeekly] = useState(true);

  const checkPermission = useCallback(() => {
    Notifications.getPermissionsAsync()
      .then((p) => setPermission(p.status === 'granted' ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied'))
      .catch(() => setPermission('undetermined'));
  }, []);

  useEffect(() => {
    checkPermission();
    getRemindersOn().then(setEvents);
    getFastingPrefs().then(setFasting);
    getWeeklyPlanOn().then(setWeekly);
    // Coming back from the phone's Settings.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && checkPermission());
    return () => sub.remove();
  }, [checkPermission]);

  /** Turning something on asks for permission first. */
  const allow = async (turningOn: boolean) => {
    if (!turningOn) return true;
    const ok = await askForAlerts();
    checkPermission();
    return ok;
  };

  const turnOn = async () => {
    if (permission === 'denied') return Linking.openSettings();
    await allow(true);
    scheduleEventAlerts().catch(() => {});
    scheduleWeeklyPlanReminder().catch(() => {});
  };

  const togglePrayer = async (id: PrayerId) => {
    if (!settings) return;
    const next = !settings.alerts[id];
    if (!(await allow(next))) return;
    await update({ alerts: { ...settings.alerts, [id]: next } });
  };

  const toggleEvents = async () => {
    const next = !events;
    if (!(await allow(next))) return;
    setEvents(next);
    await setRemindersOn(next);
    scheduleEventAlerts().catch(() => {});
  };

  const toggleFasting = async () => {
    if (!fasting) return;
    const next = { ...fasting, remind: !fasting.remind };
    if (!(await allow(next.remind))) return;
    setFasting(next);
    await setFastingPrefs(next);
    scheduleEventAlerts().catch(() => {});
  };

  const toggleWeekly = async () => {
    const next = !weekly;
    if (!(await allow(next))) return;
    setWeekly(next);
    await setWeeklyPlanOn(next);
    scheduleWeeklyPlanReminder().catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('Notifications')}
        </T>
        <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
          {tr('Everything Firdam can remind you about. Turn each one on or off.')}
        </T>

        {permission && permission !== 'granted' ? (
          <Card style={{ gap: 10, backgroundColor: colors.amberTint, borderColor: '#EBD3AE' }}>
            <T size={15} weight="bold" color={colors.amberText}>
              {tr('Notifications are off for Firdam')}
            </T>
            <T size={13.5} color={colors.amberText} style={{ lineHeight: 19 }}>
              {permission === 'denied'
                ? tr('Turn them on in your phone’s Settings, then come back here.')
                : tr('Allow notifications so the reminders below can reach you.')}
            </T>
            <Button label={permission === 'denied' ? tr('Open Settings') : tr('Allow notifications')} onPress={turnOn} />
          </Card>
        ) : null}

        <Section title={tr('ADHAN')}>
          {settings
            ? PRAYERS.filter((p) => p.alert).map((p, i, list) => (
                <View key={p.id}>
                  <SwitchRow label={tr(p.name)} hint={settings.place ? tr('At {0} time in {1}', [tr(p.name), settings.place.label]) : tr('At {0} time', [tr(p.name)])} on={!!settings.alerts[p.id]} onPress={() => togglePrayer(p.id)} />
                  {i < list.length - 1 ? <View style={styles.line} /> : null}
                </View>
              ))
            : null}
          {settings && !settings.place ? (
            <LinkRow label={tr('Set your location for prayer times ›')} onPress={() => router.push('/prayer-settings')} />
          ) : null}
        </Section>

        <Section title={tr('FAMILY CALENDAR')}>
          <SwitchRow label={tr('Event reminders')} hint={tr('The evening before, and on the day (an hour before timed events)')} on={events} onPress={toggleEvents} />
          <LinkRow label={tr('Open the calendar ›')} onPress={() => router.push('/calendar')} />
        </Section>

        <Section title={tr('FASTING')}>
          <SwitchRow label={tr('Suhoor reminders')} hint={tr('8 pm the evening before each Sunnah fast')} on={!!fasting?.remind} onPress={toggleFasting} />
          <LinkRow label={tr('See the fasts coming up ›')} onPress={() => router.push('/fasting')} />
        </Section>

        <Section title={tr('MEALS')}>
          <SwitchRow label={tr('Weekly meal plan')} hint={tr('Sunday at 5 pm, when next week’s plan is ready')} on={weekly} onPress={toggleWeekly} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        {title}
      </T>
      <Card style={{ paddingVertical: 4 }}>{children}</Card>
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.link}>
      <T size={13.5} weight="bold" color={colors.walnut}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
  line: { height: 1, backgroundColor: colors.line },
  link: { minHeight: 44, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.line },
});
