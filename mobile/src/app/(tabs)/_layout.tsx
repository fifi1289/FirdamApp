import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/components/art';
import { colors, fonts } from '@/theme';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'today' },
  { name: 'kitchen', title: 'Kitchen', icon: 'kitchen' },
  { name: 'prayer', title: 'Prayer', icon: 'prayer' },
  { name: 'halal', title: 'Halal', icon: 'halal' },
  { name: 'family', title: 'Family', icon: 'family' },
];

export default function TabsLayout() {
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
