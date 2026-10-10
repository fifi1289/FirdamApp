import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/art';
import { ComingNext, TabScreen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { WEBSITE } from '@/lib/config';
import { colors } from '@/theme';

const links = [
  { label: 'Security and two-step verification', path: '/security' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Terms of Use', path: '/terms' },
];

export default function Family() {
  const { firstName, session, signOut } = useAuth();
  const initial = (firstName ?? session?.user.email ?? '?').charAt(0).toUpperCase();

  return (
    <TabScreen title="Family" subtitle="One home, shared by everyone you invite">
      <Card style={styles.me}>
        <View style={styles.avatar}>
          <T weight="bold" color={colors.white}>
            {initial}
          </T>
        </View>
        <View style={{ flex: 1 }}>
          <T weight="bold">{firstName ?? 'You'}</T>
          <T size={13} color={colors.muted} numberOfLines={1}>
            {session?.user.email ?? ''}
          </T>
        </View>
      </Card>

      <ComingNext step={7} title="Your household and plan" text="Invite your family, set each person’s portions and allergies, and manage Firdam Family." />

      <Card style={{ paddingVertical: 4 }}>
        {links.map((l, i) => (
          <Pressable
            key={l.path}
            accessibilityRole="link"
            onPress={() => Linking.openURL(`${WEBSITE}${l.path}`)}
            style={[styles.row, i < links.length - 1 && styles.rowLine]}
          >
            <T weight="semibold" size={15}>
              {l.label}
            </T>
            <Icon name="chevron" size={18} color="#8A7A70" />
          </Pressable>
        ))}
      </Card>

      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.walnut, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
});
