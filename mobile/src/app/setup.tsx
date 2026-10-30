import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/art';
import { SwitchRow } from '@/components/switch-row';
import { Button, Card, Field, T } from '@/components/ui';
import { askForAlerts } from '@/lib/adhan-alerts';
import { useAuth } from '@/lib/auth';
import { useKitchen } from '@/lib/kitchen-store';
import { placeFromDevice, placeFromSearch } from '@/lib/location';
import { usePrayerSettings } from '@/lib/prayer';
import { markSetupDone } from '@/lib/setup';
import { scheduleWeeklyPlanReminder, setWeeklyPlanOn } from '@/lib/weekly-plan-alert';
import { formatPortions } from '@/shared/pantry-portions';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

const STEPS = 4;

/** First-time setup: location, family, reminders, then the Home ring. */
export default function Setup() {
  const { firstName } = useAuth();
  const { settings, update } = usePrayerSettings();
  const k = useKitchen();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [adhan, setAdhan] = useState(true);
  const [weekly, setWeekly] = useState(true);

  const finish = async () => {
    await markSetupDone();
    router.replace('/');
  };

  const next = () => {
    setProblem(null);
    if (step < STEPS - 1) setStep(step + 1);
    else finish();
  };

  const useDevice = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const place = await placeFromDevice();
      if (place === 'denied') setProblem(tr('Location is off for Firdam. Type your city instead.'));
      else {
        await update({ place });
        next();
      }
    } catch {
      setProblem(tr('Couldn’t find your location. Type your city instead.'));
    } finally {
      setBusy(false);
    }
  };

  const useCity = async () => {
    if (!city.trim()) return setProblem(tr('Type your city, for example Ottawa.'));
    setBusy(true);
    setProblem(null);
    try {
      const place = await placeFromSearch(city);
      if (!place) setProblem(tr('We couldn’t find that city. Try adding the country, e.g. “London, UK”.'));
      else {
        await update({ place });
        next();
      }
    } finally {
      setBusy(false);
    }
  };

  const saveReminders = async () => {
    setBusy(true);
    try {
      const wantsAny = adhan || weekly;
      const allowed = wantsAny ? await askForAlerts() : true;
      if (settings) {
        const off = Object.fromEntries(Object.keys(settings.alerts).map((id) => [id, false]));
        await update({ alerts: adhan && allowed ? { ...settings.alerts, sunrise: false } : (off as typeof settings.alerts) });
      }
      await setWeeklyPlanOn(weekly && allowed);
      scheduleWeeklyPlanReminder().catch(() => {});
      next();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Logo size={30} />
          <View style={styles.dots}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
            ))}
          </View>
          {step < STEPS - 1 ? <Button label={tr('Skip')} variant="text" onPress={finish} style={{ height: 36 }} /> : <View style={{ width: 44 }} />}
        </View>

        {step === 0 ? (
          <>
            <T weight="extrabold" size={28} style={{ letterSpacing: -0.5 }} accessibilityRole="header">
              {tr('Assalamu alaikum{0}', [firstName ? `, ${firstName}` : ''])}
            </T>
            <T size={15.5} color={colors.muted} style={{ lineHeight: 22 }}>
              {tr('Let’s set up Firdam for your family. It takes a minute. First, where are you? We use it for prayer times, the Qibla and halal places near you.')}
            </T>
            {settings?.place ? (
              <Card style={{ gap: 8 }}>
                <T weight="bold">{tr('Your location: {0}', [settings.place.label])}</T>
                <Button label={tr('Keep it')} onPress={next} />
              </Card>
            ) : null}
            <Button label={tr('Use my location')} onPress={useDevice} busy={busy} />
            <Card style={{ gap: 10 }}>
              <Field label={tr('Or type your city')} value={city} onChangeText={setCity} placeholder={tr('Ottawa')} returnKeyType="search" onSubmitEditing={useCity} />
              <Button label={tr('Use this city')} variant="secondary" onPress={useCity} />
            </Card>
            <T size={12.5} color={colors.muted}>
              {tr('Your location stays on your phone.')}
            </T>
          </>
        ) : step === 1 ? (
          <>
            <T weight="extrabold" size={28} style={{ letterSpacing: -0.5 }} accessibilityRole="header">
              {tr('Your family')}
            </T>
            <T size={15.5} color={colors.muted} style={{ lineHeight: 22 }}>
              {tr('Firdam sizes meal plans for your family and keeps allergies out of every plan.')}
            </T>
            <Card style={{ gap: 10 }}>
              <T weight="bold">
                {k.household ? tr('{0} {1} · cooks for {2}', [k.household.people, k.household.people === 1 ? 'person' : 'people', formatPortions(k.household.portions)]) : tr('Just you for now')}
              </T>
              <Button label={tr('Add family members')} variant="secondary" onPress={() => router.push('/family-members')} />
              <Button label={tr('Allergies and diet')} variant="secondary" onPress={() => router.push('/meal-preferences')} />
            </Card>
            <T size={12.5} color={colors.muted}>
              {tr('Want to share with your spouse or children? You can invite them later from Family.')}
            </T>
            <Button label={tr('Next')} onPress={next} />
          </>
        ) : step === 2 ? (
          <>
            <T weight="extrabold" size={28} style={{ letterSpacing: -0.5 }} accessibilityRole="header">
              {tr('Reminders')}
            </T>
            <T size={15.5} color={colors.muted} style={{ lineHeight: 22 }}>
              {tr('Choose what Firdam reminds you about. You can change it anytime from the bell on Home.')}
            </T>
            <Card style={{ paddingVertical: 4 }}>
              <SwitchRow label={tr('Adhan for each prayer')} hint={tr('Fajr, Dhuhr, Asr, Maghrib and Isha')} on={adhan} onPress={() => setAdhan(!adhan)} />
              <View style={styles.line} />
              <SwitchRow label={tr('Weekly meal plan')} hint={tr('Sunday at 5 pm, when next week’s plan is ready')} on={weekly} onPress={() => setWeekly(!weekly)} />
            </Card>
            <Button label={tr('Next')} onPress={saveReminders} busy={busy} />
          </>
        ) : (
          <>
            <T weight="extrabold" size={28} style={{ letterSpacing: -0.5 }} accessibilityRole="header">
              {tr('You’re all set')}
            </T>
            <T size={15.5} color={colors.muted} style={{ lineHeight: 22 }}>
              {tr('Everything Firdam does is on the Home ring: prayer and Qibla, Quran & duas, learning, fasting, your family calendar, services, halal places, meal plans, recipes, shopping, pantry and finance. Tap any circle to open it, and “Home” to come back.')}
            </T>
            <Card style={{ gap: 6, backgroundColor: colors.sageTint, borderColor: '#CFE0C6' }}>
              <T weight="bold" color={colors.sageDark}>
                {tr('A good first step')}
              </T>
              <T size={14} color={colors.sageDark}>
                {tr('Open Meal plan and let Firdam plan your week from what’s already in your kitchen.')}
              </T>
            </Card>
            <Button label={tr('Start using Firdam')} onPress={finish} />
          </>
        )}

        {problem ? (
          <T size={13.5} color={colors.brickText}>
            {problem}
          </T>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 22, height: 5, borderRadius: 3, backgroundColor: colors.sand },
  dotOn: { backgroundColor: colors.walnut },
  line: { height: 1, backgroundColor: colors.line },
});
