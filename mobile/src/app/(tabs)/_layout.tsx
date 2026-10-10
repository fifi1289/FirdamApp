import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { Icon, type IconName } from '@/components/art';
import { scheduleAdhanAlerts } from '@/lib/adhan-alerts';
import { loadPrayerSettings, usePrayerSettings } from '@/lib/prayer';
import { colors, fonts } from '@/theme';

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

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'today' },
  { name: 'kitchen', title: 'Kitchen', icon: 'kitchen' },
  { name: 'prayer', title: 'Prayer', icon: 'prayer' },
  { name: 'halal', title: 'Halal', icon: 'halal' },
  { name: 'family', title: 'Family', icon: 'family' },
];

export default function TabsLayout() {
  useAdhanAlerts();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.walnut,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.linen },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused, color }) => (
              <Icon name={t.icon} size={24} color={color} fill={focused ? colors.tint : 'none'} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
