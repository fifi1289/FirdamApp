import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { HomeButton } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { WEBSITE } from '@/lib/config';
import {
  acceptAmbassadorTerms,
  inviteUrl,
  loadAmbassadorStats,
  type AmbassadorFamily,
  type AmbassadorStats,
} from '@/lib/earn';
import { supabase } from '@/lib/supabase';
import { qrMatrix, qrPath } from '@/shared/qr';
import { colors } from '@/theme';
import { locale, tr } from '@/lib/i18n';

const monthYear = (iso: string) => new Date(iso).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });

/** Earn with Firdam: your invite link, free months and the families you invited (same as firdam.com/earn/ambassador). */
export default function EarnScreen() {
  const [stats, setStats] = useState<AmbassadorStats | null>(null);
  const [admin, setAdmin] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([loadAmbassadorStats(), supabase.rpc('is_admin')])
      .then(([s, a]) => {
        setStats(s);
        setAdmin(a.data === true);
      })
      .catch((e) => setProblem(e?.message ?? tr('Something went wrong. Please try again.')));
  }, []);
  useFocusEffect(load);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('Earn with Firdam')}
        </T>
        <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
          {tr('Invite families to Firdam and earn free months of Firdam Family.')}
        </T>

        {problem ? (
          <T color="#B3261E">{problem}</T>
        ) : !stats ? (
          <ActivityIndicator color={colors.walnut} style={{ marginTop: 30 }} />
        ) : !stats.live && !admin ? (
          <Card>
            <T weight="bold">{tr('Coming soon, in shaa Allah.')}</T>
          </Card>
        ) : (
          <>
            {!stats.live && (
              <Card style={{ backgroundColor: '#FFF4D6' }}>
                <T size={13.5}>Admin preview: the programme is switched off, so invite links don’t count yet.</T>
              </Card>
            )}
            {stats.excluded && (
              <T size={13.5} color={colors.muted}>
                {tr('This account is an admin or test account, so it can’t earn rewards.')}
              </T>
            )}
            {!stats.terms_accepted_at ? (
              <TermsCard version={stats.terms_version} onAccepted={load} />
            ) : (
              <>
                <InviteCard code={stats.code} />
                <Funnel stats={stats} />
                <FreeMonths stats={stats} />
                <Families stats={stats} />
                <T size={12.5} color={colors.muted}>
                  {tr('You accepted the')} {tr('Ambassador Terms')} {tr('on {0}.', [dayMonth(stats.terms_accepted_at)])}
                </T>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TermsCard({ version, onAccepted }: { version: string; onAccepted: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const accept = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await acceptAmbassadorTerms(version);
      onAccepted();
    } catch (e) {
      setProblem((e as { message?: string })?.message ?? tr('Something went wrong. Please try again.'));
      setBusy(false);
    }
  };
  const points = [
    'Share your personal invite link with families you know.',
    'Each new family that uses Firdam on 7 different days in its first 30 days earns you 1 free month of Firdam Family.',
    'Up to 12 free months at a time, each valid for 12 months. No cash value.',
    'Your own account and household never count.',
  ];
  return (
    <Card style={{ gap: 10 }}>
      <T weight="bold" size={17}>{tr('Become a Firdam ambassador')}</T>
      {points.map((p) => (
        <T key={p} size={14} color={colors.muted} style={{ lineHeight: 20 }}>
          • {tr(p)}
        </T>
      ))}
      <Button label={tr('Read the Ambassador Terms')} variant="text" onPress={() => Linking.openURL(`${WEBSITE}/earn/terms/ambassador`)} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        onPress={() => setAgreed((a) => !a)}
        style={styles.check}
      >
        <View style={[styles.box, agreed && styles.boxOn]}>{agreed && <T color={colors.white} weight="bold" size={13}>✓</T>}</View>
        <T size={14.5} style={{ flex: 1 }}>{tr('I accept the Ambassador Terms')}</T>
      </Pressable>
      {problem && <T size={13} color="#B3261E">{problem}</T>}
      <Button label={tr('Get my invite link')} onPress={accept} busy={busy} disabled={!agreed} />
    </Card>
  );
}

function InviteCard({ code }: { code: string }) {
  const url = inviteUrl(code);
  const qr = useMemo(() => qrPath(qrMatrix(url)), [url]);
  const message = tr('Assalamu alaykum! I use Firdam for our family’s meals, prayer times and home. Join with my link: {0}', [url]);

  return (
    <Card style={{ gap: 12, alignItems: 'stretch' }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        {tr('YOUR INVITE LINK')}
      </T>
      <View style={{ alignItems: 'center' }}>
        <Svg width={180} height={180} viewBox={`0 0 ${qr.size} ${qr.size}`} accessibilityLabel={tr('QR code for your invite link')}>
          <Rect width={qr.size} height={qr.size} fill="#fff" />
          <Path d={qr.path} fill="#000" />
        </Svg>
      </View>
      <T size={14} selectable style={{ textAlign: 'center', writingDirection: 'ltr' }}>{url}</T>
      <T size={13} color={colors.muted} style={{ textAlign: 'center' }}>
        {tr('Or they can type your code when they sign up:')} <T weight="bold" size={13}>{code}</T>
      </T>
      <Button label={tr('Share')} onPress={() => Share.share({ message })} />
      <T size={12.5} color={colors.muted} style={{ textAlign: 'center' }}>
        {tr('Press and hold the link to copy it.')}
      </T>
    </Card>
  );
}

function Funnel({ stats }: { stats: AmbassadorStats }) {
  const steps = [
    { label: 'Link opened', value: stats.clicks },
    { label: 'Families joined', value: stats.signups },
    { label: 'Active families', value: stats.qualified },
    { label: 'Paying families', value: stats.paying },
  ];
  return (
    <View style={styles.grid}>
      {steps.map((s) => (
        <Card key={s.label} style={styles.stat}>
          <T weight="extrabold" size={24}>{s.value}</T>
          <T size={13} color={colors.muted}>{tr(s.label)}</T>
        </Card>
      ))}
    </View>
  );
}

function FreeMonths({ stats }: { stats: AmbassadorStats }) {
  return (
    <Card style={{ gap: 8 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        {tr('YOUR FREE MONTHS')}
      </T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[
          { label: 'Saved', value: `${stats.months_banked} / ${stats.max_banked}` },
          { label: 'Used', value: String(stats.months_used) },
          { label: 'Expiring within 30 days', value: String(stats.months_expiring) },
        ].map((x) => (
          <View key={x.label} style={{ flex: 1, alignItems: 'center' }}>
            <T weight="extrabold" size={20}>{x.value}</T>
            <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>{tr(x.label)}</T>
          </View>
        ))}
      </View>
      <T size={13.5} color={colors.muted} style={{ lineHeight: 19 }}>
        {stats.next_expiry
          ? tr('Your next free month expires on {0}. Saved months are used automatically when Firdam Family launches.', [dayMonth(stats.next_expiry)])
          : tr('Saved months are used automatically when Firdam Family launches.')}
      </T>
    </Card>
  );
}

function familyStatus(f: AmbassadorFamily, needed: number): string {
  if (f.on_hold) return tr('Being checked');
  if (f.status === 'qualified') return f.free_month === 'over_cap' ? tr('Active (you already hold the most free months)') : tr('Active — free month earned');
  if (f.status === 'not_qualified') return tr('Didn’t reach {0} days', [needed]);
  if (f.active_days >= needed) return tr('Waiting for email check and family profile');
  return tr('Getting started');
}

function Families({ stats }: { stats: AmbassadorStats }) {
  return (
    <Card style={{ gap: 6 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        {tr('FAMILIES YOU INVITED')}
      </T>
      {stats.families.length === 0 ? (
        <T size={14} color={colors.muted}>{tr('No families yet. Share your link with a family you think Firdam would help.')}</T>
      ) : (
        <>
          <T size={12.5} color={colors.muted}>{tr('To protect their privacy, you only see their progress, never who they are.')}</T>
          {stats.families.map((f, i) => (
            <View key={i} style={[styles.family, i < stats.families.length - 1 && styles.line]}>
              <T weight="semibold" size={14.5}>{tr('Family joined {0}', [monthYear(f.joined)])}</T>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.min(100, (f.active_days / stats.needed_days) * 100)}%` }]} />
              </View>
              <T size={13} color={colors.muted}>
                {tr('{0} / {1} days', [Math.min(f.active_days, stats.needed_days), stats.needed_days])} · {familyStatus(f, stats.needed_days)}
                {f.paying ? ` · ${tr('Paying')}` : ''}
              </T>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, gap: 2 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.walnut, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.walnut },
  family: { paddingVertical: 10, gap: 6 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.tint, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.walnut },
});
