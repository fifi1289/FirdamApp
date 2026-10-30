import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/art';
import { TabScreen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { WEBSITE } from '@/lib/config';
import { callFunction } from '@/lib/functions';
import { useKitchen } from '@/lib/kitchen-store';
import { formatPortions } from '@/shared/pantry-portions';
import { colors } from '@/theme';
import { showAlert } from '@/components/firdam-alert';
import { tr } from '@/lib/i18n';

/** Opens the phone's email app with the app version filled in, so we can help faster. */
function feedbackUrl(): string {
  const version = Constants.expoConfig?.version ?? '';
  const subject = 'Firdam app feedback';
  const body = `\n\n\n—\nFirdam ${version} · ${Platform.OS} ${Platform.Version}`;
  return `mailto:support@firdam.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const links = [
  { label: 'Send feedback or report a problem', path: 'feedback' },
  { label: 'Help and support', path: '/support' },
  { label: 'Security and two-step verification', path: '/security' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Terms of Use', path: '/terms' },
];

export default function Family() {
  const { firstName, session, signOut } = useAuth();
  const k = useKitchen();
  const [deleting, setDeleting] = useState(false);

  // Apple and Google require that people can delete their account from the app.
  const deleteAccount = () => {
    showAlert(
      tr('Delete your account?'),
      tr('This permanently deletes your account and your personal data: pantry, plans, shopping lists, budget and family details. It can’t be undone.'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await callFunction('delete-account', undefined, { confirm: 'DELETE' });
              await signOut();
            } catch (e) {
              showAlert(tr('Could not delete your account'), e instanceof Error ? e.message : tr('Please try again, or email support@firdam.com.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };
  const initial = (firstName ?? session?.user.email ?? '?').charAt(0).toUpperCase();

  return (
    <TabScreen title={tr('Family')} subtitle={tr('One home, shared by everyone you invite')}>
      <Card style={styles.me}>
        <View style={styles.avatar}>
          <T weight="bold" color={colors.white}>
            {initial}
          </T>
        </View>
        <View style={{ flex: 1 }}>
          <T weight="bold">{firstName ?? tr('You')}</T>
          <T size={13} color={colors.muted} numberOfLines={1}>
            {session?.user.email ?? ''}
          </T>
        </View>
      </Card>

      <Card style={{ gap: 4 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          {tr('YOUR HOUSEHOLD')}
        </T>
        <T size={16} weight="bold">
          {k.household ? tr('{0} {1} · cooks for {2}', [k.household.people, k.household.people === 1 ? 'person' : 'people', formatPortions(k.household.portions)]) : tr('Loading…')}
        </T>
        <T size={13.5} color={colors.muted}>
          {k.prefs?.allergies.length ? tr('Kept out of every plan: {0}', [k.prefs.allergies.join(', ')]) : tr('No allergies set yet.')}
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label={tr('Family members')} variant="secondary" onPress={() => router.push('/family-members')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={tr('Allergies')} variant="secondary" onPress={() => router.push('/meal-preferences')} />
          </View>
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          {tr('SHARE WITH YOUR FAMILY')}
        </T>
        <T size={14} color={colors.muted}>
          {tr('Invite your spouse and children to share the family calendar, shopping list, meal plans and pantry.')}
        </T>
        <Button label={tr('Invite your family')} onPress={() => router.push('/household')} />
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        {links.map((l, i) => (
          <Pressable
            key={l.path}
            accessibilityRole="link"
            onPress={() => Linking.openURL(l.path === 'feedback' ? feedbackUrl() : `${WEBSITE}${l.path}`)}
            style={[styles.row, i < links.length - 1 && styles.rowLine]}
          >
            <T weight="semibold" size={15}>
              {tr(l.label)}
            </T>
            <Icon name="chevron" size={18} color="#8A7A70" />
          </Pressable>
        ))}
      </Card>

      <Button label={tr('Sign out')} variant="secondary" onPress={signOut} />
      <Button label={tr('Delete my account')} variant="text" onPress={deleteAccount} busy={deleting} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.walnut, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
});
