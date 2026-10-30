import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/kitchen-ui';
import { MakeupCard } from '@/components/makeup-card';
import { HomeButton } from '@/components/screen';
import { SwitchRow } from '@/components/switch-row';
import { Button, Card, T } from '@/components/ui';
import { askForAlerts } from '@/lib/adhan-alerts';
import { scheduleEventAlerts } from '@/lib/event-alerts';
import { getFastingPrefs, setFastingPrefs, upcomingFasts, type FastingPrefs } from '@/lib/fasting';
import { iso, parseISODate, type FastingDay } from '@/shared/calendar-core';
import { insideRamadan, isoDate, nextRamadan } from '@/shared/makeup-core';
import { colors } from '@/theme';
import { locale, tr } from '@/lib/i18n';

/** Sunnah fasts: the recommended fasting days coming up, with a suhoor reminder. Ramadan joins here later. */
export default function Fasting() {
  const [prefs, setPrefs] = useState<FastingPrefs | null>(null);
  const [days, setDays] = useState<FastingDay[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Two tabs keep the page short: Sunnah fasts, and Ramadan (with days to make up).
  const [tab, setTab] = useState<'sunnah' | 'ramadan'>(insideRamadan(isoDate(new Date())) ? 'ramadan' : 'sunnah');
  const next = nextRamadan();

  const load = useCallback((p: FastingPrefs) => {
    setDays(null);
    upcomingFasts(p)
      .then((d) => {
        setDays(d);
        setProblem(null);
      })
      .catch(() => {
        setDays([]);
        setProblem(tr('Could not load the Hijri dates. Check your connection and try again.'));
      });
  }, []);

  useEffect(() => {
    getFastingPrefs().then((p) => {
      setPrefs(p);
      load(p);
    });
  }, [load]);

  const update = async (next: FastingPrefs) => {
    if (next.remind && !prefs?.remind && !(await askForAlerts())) {
      setProblem(tr('Allow notifications for Firdam in your phone’s Settings to get suhoor reminders.'));
      return;
    }
    const reload = next.mondaysThursdays !== prefs?.mondaysThursdays;
    setPrefs(next);
    await setFastingPrefs(next);
    scheduleEventAlerts().catch(() => {});
    if (reload) load(next);
  };

  const today = iso(new Date());

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('Fasting')}
        </T>
        <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
          {tr('Sunnah fasts and Ramadan.')}
        </T>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label={tr('Sunnah fasts')} selected={tab === 'sunnah'} onPress={() => setTab('sunnah')} />
          <Chip label={tr('Ramadan')} selected={tab === 'ramadan'} onPress={() => setTab('ramadan')} />
        </View>

        {tab === 'ramadan' ? (
          <>
            {next ? (
              <Card style={{ gap: 4, backgroundColor: colors.espresso, borderColor: colors.espresso }}>
                <T size={12.5} weight="bold" color={colors.gold} style={{ letterSpacing: 0.4 }}>
                  {tr('RAMADAN {0}', [next.year])}
                </T>
                <T size={26} weight="extrabold" color={colors.white}>
                  {next.daysAway === 1 ? tr('In 1 day') : tr('In {0} days', [next.daysAway])}
                </T>
                <T size={13} color={colors.goldText}>
                  {tr('Around {0}, depending on the moon sighting', [parseISODate(next.start).toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' })])}
                </T>
              </Card>
            ) : null}
            <MakeupCard />
          </>
        ) : (
          <>

        {prefs ? (
          <Card style={{ gap: 4, paddingVertical: 6 }}>
            <SwitchRow
              label={tr('Remind me for suhoor')}
              hint={tr('At 8 pm the evening before each fast')}
              on={prefs.remind}
              onPress={() => update({ ...prefs, remind: !prefs.remind })}
            />
            <View style={styles.line} />
            <SwitchRow
              label={tr('Include Mondays and Thursdays')}
              hint={tr('The weekly Sunnah fasts')}
              on={prefs.mondaysThursdays}
              onPress={() => update({ ...prefs, mondaysThursdays: !prefs.mondaysThursdays })}
            />
          </Card>
        ) : null}

        {problem ? (
          <T size={13.5} color={colors.brickText}>
            {problem}
          </T>
        ) : null}

        <Card style={{ gap: 2 }}>
          <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4, marginBottom: 4 }}>
            {tr('NEXT TWO MONTHS')}
          </T>
          {!days ? (
            <ActivityIndicator color={colors.walnut} style={{ marginVertical: 16 }} />
          ) : days.length === 0 ? (
            <View style={{ gap: 10, paddingVertical: 6 }}>
              <T size={14} color={colors.muted}>
                {tr('No Sunnah fasts found in the next two months.')}
              </T>
              {problem && prefs ? <Button label={tr('Try again')} variant="secondary" onPress={() => load(prefs)} /> : null}
            </View>
          ) : (
            days.map((d, i) => (
              <View key={`${d.date}-${d.title}`} style={[styles.row, i < days.length - 1 && styles.rowLine]}>
                <View style={styles.date}>
                  <T size={11} weight="bold" color={colors.walnut}>
                    {parseISODate(d.date).toLocaleDateString(locale(), { weekday: 'short' }).toUpperCase()}
                  </T>
                  <T size={18} weight="extrabold">
                    {parseISODate(d.date).getDate()}
                  </T>
                  <T size={11} color={colors.muted}>
                    {parseISODate(d.date).toLocaleDateString(locale(), { month: 'short' })}
                  </T>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T size={15} weight="semibold">
                    {d.date === today ? tr('Today · {0}', [d.title]) : tr(d.title)}
                  </T>
                  <T size={12.5} color={colors.muted} style={{ lineHeight: 17 }}>
                    {d.why}
                  </T>
                </View>
              </View>
            ))
          )}
        </Card>

        <T size={12.5} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
          {tr('Islamic dates may differ by a day from your local moon sighting. No voluntary fasts are listed in Ramadan, on the Eids or the days of Tashreeq.')}
        </T>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  line: { height: 1, backgroundColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  date: { width: 50, alignItems: 'center', backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 6 },
});
