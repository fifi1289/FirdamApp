import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeButton } from '@/components/screen';
import { Button, Card, Field, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  acceptInvite,
  createHousehold,
  createInvite,
  inviteLink,
  leaveHousehold,
  loadHousehold,
  removeMember,
  revokeInvite,
  tokenFrom,
  type HouseholdInvite,
  type HouseholdState,
} from '@/lib/household';
import { refreshKitchen } from '@/lib/kitchen-store';
import { colors } from '@/theme';
import { tr } from '@/lib/i18n';

const SHARED = ['Family calendar', 'Shopping lists', 'Meal plans', 'Pantry', 'Family profiles'];
const MAX = 8;

function message(e: unknown): string {
  return e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : tr('Something went wrong. Please try again.');
}

/** Share Firdam with your family: one household, invites by link, the same as on firdam.com. */
export default function HouseholdScreen() {
  const { session } = useAuth();
  const me = session?.user.id;
  const [state, setState] = useState<HouseholdState | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(() => {
    loadHousehold()
      .then(setState)
      .catch((e) => {
        setState({ household: null, members: [], invites: [], capacity: 4 });
        setProblem(message(e));
      });
  }, []);
  useFocusEffect(load);

  const run = async (key: string, fn: () => Promise<void>, done?: string) => {
    setBusy(key);
    setProblem(null);
    setNotice(null);
    try {
      await fn();
      if (done) setNotice(done);
      load();
      // Shared lists, plans and pantry change when you join or leave.
      refreshKitchen().catch(() => {});
    } catch (e) {
      setProblem(message(e));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const share = (inv: HouseholdInvite) =>
    Share.share({
      message: tr('Assalamu alaikum! Join our family on Firdam: we share our calendar, shopping list, meal plans and pantry. Sign in with {0}, then open this link: {1}', [inv.email, inviteLink(inv.token)]),
    }).catch(() => {});

  const invite = async () => {
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setProblem(tr('Enter a valid email address.'));
    if (!state?.household) return;
    if (state.members.length + state.invites.length >= state.capacity) {
      return setProblem(tr('Your household is full ({0} people).', [state.capacity]));
    }
    setBusy('invite');
    setProblem(null);
    try {
      const inv = await createInvite(state.household.id, value);
      setEmail('');
      setState((s) => (s ? { ...s, invites: [inv, ...s.invites] } : s));
      share(inv);
    } catch (e) {
      setProblem(message(e));
    } finally {
      setBusy(null);
    }
  };

  const join = () => {
    const token = tokenFrom(code);
    if (!token) return setProblem(tr('Paste the whole invite link you received.'));
    run('join', () => acceptInvite(token), tr('Welcome! You now share your family’s calendar, lists, plans and pantry.'));
    setCode('');
  };

  const household = state?.household ?? null;
  const isOwner = !!household && household.owner_id === me;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {household ? household.name : tr('Share with your family')}
        </T>
        <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
          {tr('One home for everyone: plan together, shop together, never miss a family date.')}
        </T>

        <View style={styles.wrap}>
          {SHARED.map((s) => (
            <View key={s} style={styles.pill}>
              <T size={12.5} weight="semibold" color={colors.sageDark}>{`✓ ${tr(s)}`}</T>
            </View>
          ))}
        </View>
        <T size={12.5} color={colors.muted}>
          {tr('Budget, Quran and personal trackers stay private.')}
        </T>

        {problem ? (
          <T size={13.5} color={colors.brickText}>
            {problem}
          </T>
        ) : null}
        {notice ? (
          <T size={13.5} color={colors.sageDark}>
            {notice}
          </T>
        ) : null}

        {!state ? (
          <ActivityIndicator color={colors.walnut} style={{ marginTop: 20 }} />
        ) : !household ? (
          <>
            <Card style={{ gap: 10 }}>
              <T weight="bold" size={16}>
                {tr('Start your family household')}
              </T>
              <Field label={tr('Household name')} value={name} onChangeText={setName} placeholder={tr('The Rahman family')} maxLength={80} />
              <Button label={tr('Create household')} onPress={() => run('create', () => createHousehold(name), tr('Your household is ready. Now invite your family.'))} busy={busy === 'create'} />
            </Card>
            <Card style={{ gap: 10 }}>
              <T weight="bold" size={16}>
                {tr('Were you invited?')}
              </T>
              <T size={13.5} color={colors.muted}>
                {tr('Paste the invite link you received by message or email.')}
              </T>
              <Field label={tr('Invite link')} value={code} onChangeText={setCode} placeholder={tr('https://firdam.com/join/…')} autoCapitalize="none" autoCorrect={false} />
              <Button label={tr('Join household')} variant="secondary" onPress={join} busy={busy === 'join'} />
            </Card>
          </>
        ) : (
          <>
            <Card style={{ gap: 2 }}>
              <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4, marginBottom: 4 }}>
                {tr('MEMBERS · {0} OF {1}', [state.members.length, Math.min(state.capacity, MAX)])}
              </T>
              {state.members.map((m, i) => (
                <View key={m.user_id} style={[styles.row, i < state.members.length - 1 && styles.line]}>
                  <View style={styles.avatar}>
                    <T weight="bold" color={colors.white}>
                      {(m.display_name ?? '?').charAt(0).toUpperCase()}
                    </T>
                  </View>
                  <T size={15} weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                    {`${m.display_name ?? tr('Family member')}${m.user_id === me ? ` ${tr('(you)')}` : ''}${m.role === 'owner' ? ` · ${tr('owner')}` : ''}`}
                  </T>
                  {isOwner && m.user_id !== me ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={tr('Remove {0}', [m.display_name ?? 'member'])}
                      onPress={() => (confirm === m.user_id ? run('remove', () => removeMember(m.user_id), tr('Member removed.')) : setConfirm(m.user_id))}
                      hitSlop={8}
                    >
                      <T size={13} weight="bold" color={colors.brickText}>
                        {confirm === m.user_id ? tr('Remove?') : tr('Remove')}
                      </T>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </Card>

            <Card style={{ gap: 10 }}>
              <T weight="bold" size={16}>
                {tr('Invite a family member')}
              </T>
              <T size={13.5} color={colors.muted}>
                {tr('Enter the email they use for Firdam. You’ll get a link to send them by message or email.')}
              </T>
              <Field label={tr('Their email')} value={email} onChangeText={setEmail} placeholder={tr('name@example.com')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <Button label={tr('Create invite link')} onPress={invite} busy={busy === 'invite'} />
            </Card>

            {state.invites.length ? (
              <Card style={{ gap: 2 }}>
                <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4, marginBottom: 4 }}>
                  {tr('WAITING TO JOIN')}
                </T>
                {state.invites.map((inv, i) => (
                  <View key={inv.id} style={[styles.row, i < state.invites.length - 1 && styles.line]}>
                    <T size={14.5} style={{ flex: 1 }} numberOfLines={1}>
                      {inv.email}
                    </T>
                    <Pressable accessibilityRole="button" onPress={() => share(inv)} hitSlop={8} style={styles.small}>
                      <T size={13} weight="bold" color={colors.walnut}>
                        {tr('Send again')}
                      </T>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={tr('Cancel invite for {0}', [inv.email])} onPress={() => run('revoke', () => revokeInvite(inv.id))} hitSlop={8}>
                      <T size={13} weight="bold" color={colors.muted}>
                        {tr('Cancel')}
                      </T>
                    </Pressable>
                  </View>
                ))}
              </Card>
            ) : null}

            <Button
              label={confirm === 'leave' ? tr('Tap again to leave the household') : tr('Leave household')}
              variant="text"
              onPress={() => (confirm === 'leave' ? run('leave', leaveHousehold, tr('You left the household.')) : setConfirm('leave'))}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: colors.sageTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.walnut, alignItems: 'center', justifyContent: 'center' },
  small: { backgroundColor: colors.tint, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
});
