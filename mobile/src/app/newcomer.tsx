import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField, formatDay } from '@/components/date-field';
import { showAlert } from '@/components/firdam-alert';
import { Badge } from '@/components/kitchen-ui';
import { HomeButton } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { getLang, tr } from '@/lib/i18n';
import { savePlan, saveStep, useNewcomer, type NewcomerPerson } from '@/lib/newcomer';
import {
  NEWCOMER_PHASES,
  currentPhase,
  daysInCountry,
  directionsUrl,
  helpFor,
  nextStep,
  pick,
  progress,
  stepsFor,
  stepView,
  transitFor,
  tripPlannerUrl,
  type NewcomerCountry,
  type NewcomerHelp,
  type NewcomerPhase,
  type NewcomerPlan,
  type NewcomerStatus,
  type NewcomerStep,
  type NewcomerStepRow,
} from '@/shared/newcomer-core';
import { NEWCOMER_COUNTRIES, newcomerCountry } from '@/shared/newcomer-countries';
import { colors, fonts } from '@/theme';

type Tab = 'plan' | 'around' | 'free' | 'discount' | 'deal';

/**
 * Newcomer: the family's first year in a new country, step by step. Shared by
 * the family: each step can be given to someone, and everyone sees who did it.
 */
export default function Newcomer() {
  const { state, error, refresh, setState } = useNewcomer();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('plan');

  if (!state) {
    return (
      <Shell>
        {error ? (
          <T color={colors.brickText}>{tr('Couldn’t load your plan. Check your connection and try again.')}</T>
        ) : (
          <ActivityIndicator color={colors.walnut} style={{ marginTop: 40 }} />
        )}
      </Shell>
    );
  }

  if (!state.plan || editing) {
    return (
      <Shell>
        <Setup
          plan={state.plan}
          onSaved={(plan) => {
            setState({ ...state, plan });
            setEditing(false);
          }}
          onCancel={state.plan ? () => setEditing(false) : undefined}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PlanView
        plan={state.plan}
        rows={state.rows}
        people={state.people}
        hasKids={state.hasKids}
        tab={tab}
        setTab={setTab}
        onEdit={() => setEditing(true)}
        onRow={(row) => setState({ ...state, rows: [...state.rows.filter((r) => r.step_key !== row.step_key), row] })}
        onRefresh={refresh}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Setup ─────────────────────────────────────────────────────────── */

function Setup({ plan, onSaved, onCancel }: { plan: NewcomerPlan | null; onSaved: (p: NewcomerPlan) => void; onCancel?: () => void }) {
  const lang = getLang();
  const [country] = useState(plan?.country ?? 'CA');
  const c = newcomerCountry(country);
  const [region, setRegion] = useState<string | null>(plan?.region ?? null);
  const [city, setCity] = useState(plan?.city ?? '');
  const [status, setStatus] = useState<NewcomerStatus | null>(plan?.status ?? null);
  const [arrival, setArrival] = useState(plan?.arrival_date ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!status) return;
    setBusy(true);
    try {
      onSaved(await savePlan({ country, region, city, status, arrival_date: arrival || null }, plan?.id));
    } catch {
      showAlert(tr('Couldn’t save'), tr('Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 6 }}>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('Newcomer')}
        </T>
        <T size={14.5} color={colors.muted}>
          {tr('Your first year in a new country, step by step, shared with your family.')}
        </T>
      </View>

      <Section label={tr('COUNTRY')}>
        <View style={styles.wrap}>
          {NEWCOMER_COUNTRIES.map((x) => (
            <Pill key={x.code} label={pick(x.name, lang)} on={x.code === country} />
          ))}
        </View>
        <T size={12.5} color={colors.muted}>
          {tr('More countries are coming: United States, United Kingdom, Australia and more.')}
        </T>
      </Section>

      <Section label={tr('PROVINCE')}>
        <View style={styles.wrap}>
          {c.regions.map((r) => (
            <Pill key={r.code} label={pick(r.name, lang)} on={r.code === region} onPress={() => setRegion(r.code)} />
          ))}
        </View>
      </Section>

      <Section label={tr('CITY')}>
        <TextInput value={city} onChangeText={setCity} placeholder={tr('e.g. Ottawa')} placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel={tr('City')} maxLength={80} />
      </Section>

      <Section label={tr('HOW ARE YOU COMING?')}>
        <View style={styles.wrap}>
          {c.statuses.map((s) => (
            <Pill key={s.id} label={pick(s.name, lang)} on={s.id === status} onPress={() => setStatus(s.id)} />
          ))}
        </View>
      </Section>

      <DateField label={tr('Arrival date')} value={arrival} onChange={setArrival} optional placeholder={tr('Not arrived yet')} />
      <T size={12.5} color={colors.muted} style={{ marginTop: -10 }}>
        {tr('Not arrived yet? Leave it empty and your plan starts with “Before you land”.')}
      </T>

      <Button label={plan ? tr('Save') : tr('Make our plan')} onPress={save} disabled={!status || busy} />
      {onCancel ? <Button label={tr('Cancel')} variant="secondary" onPress={onCancel} /> : null}
    </View>
  );
}

/* ── The plan ──────────────────────────────────────────────────────── */

function PlanView({
  plan,
  rows,
  people,
  hasKids,
  tab,
  setTab,
  onEdit,
  onRow,
}: {
  plan: NewcomerPlan;
  rows: NewcomerStepRow[];
  people: NewcomerPerson[];
  hasKids: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  onEdit: () => void;
  onRow: (r: NewcomerStepRow) => void;
  onRefresh: () => void;
}) {
  const lang = getLang();
  const country = newcomerCountry(plan.country);
  const steps = useMemo(() => stepsFor(country, plan, hasKids), [country, plan, hasKids]);
  const phase = currentPhase(plan.arrival_date);
  const [shown, setShown] = useState<NewcomerPhase>(phase);
  const [open, setOpen] = useState<NewcomerStep | null>(null);
  const { done, total } = progress(steps, rows);
  const next = nextStep(steps, rows, phase);
  const days = daysInCountry(plan.arrival_date);
  const region = country.regions.find((r) => r.code === plan.region);
  const status = country.statuses.find((s) => s.id === plan.status);
  const rowFor = (key: string) => rows.find((r) => r.step_key === key);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          {[pick(country.name, lang), region ? pick(region.name, lang) : null, plan.city].filter(Boolean).join(' · ').toUpperCase()}
        </T>
        <T weight="extrabold" size={28} style={{ letterSpacing: -0.5 }} accessibilityRole="header">
          {tr('Newcomer')}
        </T>
        <Pressable accessibilityRole="button" onPress={onEdit} hitSlop={6}>
          <T size={13.5} weight="bold" color={colors.walnut}>
            {status ? pick(status.name, lang) : ''} · {tr('Change ›')}
          </T>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T size={26} weight="extrabold" color={colors.linen}>
            {tr('{0} of {1}', [done, total])}
          </T>
          <T size={13.5} color={colors.goldText}>
            {tr('steps done by your family')}
          </T>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${total ? Math.round((done / total) * 100) : 0}%` }]} />
        </View>
        <T size={13} color={colors.goldText}>
          {days === null ? tr('Add your arrival date to see where you are.') : days < 0 ? tr('{0} days until you land', [-days]) : tr('Day {0} in {1}', [days + 1, pick(country.name, lang)])}
          {next ? ` · ${tr('Next: {0}', [stepView(next, plan.region, lang).title])}` : ''}
        </T>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityRole="tablist">
        {(
          [
            ['plan', 'Our plan'],
            ['around', 'Getting around'],
            ['free', 'Free help'],
            ['discount', 'Discounts'],
            ['deal', 'Deals'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <Pill key={k} label={tr(label)} on={tab === k} onPress={() => setTab(k)} />
        ))}
      </ScrollView>

      {tab === 'plan' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {NEWCOMER_PHASES.map((p) => {
              const inPhase = steps.filter((s) => s.phase === p.id);
              if (!inPhase.length) return null;
              const allDone = inPhase.every((s) => rowFor(s.key)?.done_at);
              return <Pill key={p.id} label={`${tr(p.label)}${allDone ? ' ✓' : ''}`} on={shown === p.id} onPress={() => setShown(p.id)} />;
            })}
          </ScrollView>
          <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>
            {tr('Tap a step to see how to do it, what to bring and where to go.')}
          </T>
          <View style={{ gap: 10 }}>
            {steps
              .filter((s) => s.phase === shown)
              .map((s) => (
                <StepRow key={s.key} step={s} plan={plan} row={rowFor(s.key)} people={people} onOpen={() => setOpen(s)} onRow={onRow} />
              ))}
          </View>
          <T size={12} color={colors.muted} style={{ lineHeight: 17 }}>
            {tr('Checked against official sources on {0}. General guidance, not immigration or legal advice.', [formatDay(country.checked)])}
          </T>
        </>
      ) : tab === 'around' ? (
        <Around country={country} plan={plan} onDiscounts={() => setTab('discount')} />
      ) : (
        <HelpList items={helpFor(country, plan, tab)} kind={tab} />
      )}

      <StepSheet key={open?.key ?? 'none'} step={open} plan={plan} row={open ? rowFor(open.key) : undefined} people={people} onClose={() => setOpen(null)} onRow={onRow} onTab={(t) => { setOpen(null); setTab(t); }} />
    </View>
  );
}

const nameOf = (people: NewcomerPerson[], id: string | null | undefined) => {
  const p = people.find((x) => x.id === id);
  return p ? (p.me ? tr('you') : p.name) : null;
};

function StepRow({
  step,
  plan,
  row,
  people,
  onOpen,
  onRow,
}: {
  step: NewcomerStep;
  plan: NewcomerPlan;
  row?: NewcomerStepRow;
  people: NewcomerPerson[];
  onOpen: () => void;
  onRow: (r: NewcomerStepRow) => void;
}) {
  const lang = getLang();
  const v = stepView(step, plan.region, lang);
  const done = !!row?.done_at;
  const me = people.find((p) => p.me);
  const toggle = async () => {
    try {
      onRow(await saveStep(plan.id, step.key, done ? { done_at: null, done_by: null } : { done_at: new Date().toISOString(), done_by: me?.id ?? null }));
    } catch {
      showAlert(tr('Couldn’t save'), tr('Check your connection and try again.'));
    }
  };
  const who = done ? tr('Done by {0}', [nameOf(people, row?.done_by) ?? tr('family')]) : row?.assignee ? nameOf(people, row.assignee) ?? tr('Family') : tr('Anyone');
  const inside = [
    (v.how.length === 1 ? tr('1 step') : tr('{0} steps', [v.how.length])),
    v.bring ? tr('What to bring') : null,
    v.tips.length ? tr('Tips') : null,
    step.place ? tr('Directions') : null,
  ].filter(Boolean) as string[];
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={v.title} onPress={toggle} hitSlop={8} style={[styles.box, done && styles.boxOn]}>
          {done ? (
            <T size={13} weight="extrabold" color={colors.linen}>
              ✓
            </T>
          ) : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityHint={tr('Opens the step')} onPress={onOpen} style={{ flex: 1, gap: 6 }}>
          <T size={15.5} weight="bold" color={done ? colors.muted : colors.espresso} style={done ? { textDecorationLine: 'line-through' } : undefined}>
            {v.title}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {step.urgent && !done ? <Badge label={tr('Urgent')} tone="brick" /> : null}
            {step.cost === 'free' ? <Badge label={tr('Free')} tone="sage" /> : null}
            <T size={12.5} color={done ? colors.sageDark : colors.muted} weight={done ? 'bold' : 'regular'}>
              {who}
            </T>
          </View>
          {!done ? (
            <T size={13.5} color="#4A3F39" numberOfLines={2} style={{ lineHeight: 19 }}>
              {v.why}
            </T>
          ) : null}
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${tr('How to do it')}: ${v.title}`} onPress={onOpen} style={({ pressed }) => [styles.open, pressed && { opacity: 0.8 }]}>
        <T size={12} color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>
          {inside.join(' · ')}
        </T>
        <T size={14} weight="bold" color={colors.walnut}>
          {tr('How to do it ›')}
        </T>
      </Pressable>
    </View>
  );
}

/* ── One step ──────────────────────────────────────────────────────── */

function StepSheet({
  step,
  plan,
  row,
  people,
  onClose,
  onRow,
  onTab,
}: {
  step: NewcomerStep | null;
  plan: NewcomerPlan;
  row?: NewcomerStepRow;
  people: NewcomerPerson[];
  onClose: () => void;
  onRow: (r: NewcomerStepRow) => void;
  onTab: (t: Tab) => void;
}) {
  const lang = getLang();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!step) return null;
  const v = stepView(step, plan.region, lang);
  const done = !!row?.done_at;
  const me = people.find((p) => p.me);

  const save = async (patch: Parameters<typeof saveStep>[2]) => {
    setBusy(true);
    try {
      onRow(await saveStep(plan.id, step.key, patch));
    } catch {
      showAlert(tr('Couldn’t save'), tr('Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.linen }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 18 }} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <T size={14} weight="bold" color={colors.walnut}>
              {tr('Close')}
            </T>
          </Pressable>

          <View style={{ gap: 8 }}>
            <View style={styles.wrap}>
              {step.urgent ? <Badge label={tr('Urgent')} tone="brick" /> : null}
              {step.cost === 'free' ? <Badge label={tr('Free')} tone="sage" /> : null}
              <Badge label={step.who === 'each-adult' ? tr('Each adult') : step.who === 'family' ? tr('Once for the family') : tr('Anyone')} tone="walnut" />
            </View>
            <T size={24} weight="extrabold" style={{ lineHeight: 30 }} accessibilityRole="header">
              {v.title}
            </T>
            <T size={15} color="#4A3F39" style={{ lineHeight: 22 }}>
              {v.why}
            </T>
            {v.takes ? (
              <T size={13.5} weight="semibold" color={colors.muted}>
                ⏱ {v.takes}
              </T>
            ) : null}
            {v.note ? (
              <View style={styles.note}>
                <T size={14} color="#24402F" style={{ lineHeight: 20 }}>
                  {v.note}
                </T>
              </View>
            ) : null}
          </View>

          <Card style={{ gap: 12 }}>
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              {tr('WHO’S DOING IT')}
            </T>
            <View style={styles.wrap}>
              {people.map((p) => (
                <Pill key={p.id} label={p.me ? tr('You') : p.name} on={row?.assignee === p.id} onPress={() => save({ assignee: p.id })} />
              ))}
              <Pill label={tr('Anyone')} on={!row?.assignee} onPress={() => save({ assignee: null })} />
            </View>
            {people.length < 2 ? (
              <Pressable accessibilityRole="link" onPress={() => router.push('/household')}>
                <T size={13} weight="bold" color={colors.walnut}>
                  {tr('Invite your spouse to share the plan ›')}
                </T>
              </Pressable>
            ) : null}
            {done ? (
              <View style={styles.doneBox}>
                <T size={14} weight="bold" color="#24402F">
                  {tr('Done by {0}', [nameOf(people, row?.done_by) ?? tr('family')])}
                  {row?.done_at ? ` · ${formatDay(row.done_at.slice(0, 10))}` : ''}
                </T>
                {row?.note ? (
                  <T size={13.5} color="#24402F">
                    “{row.note}”
                  </T>
                ) : null}
              </View>
            ) : (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={tr('Add a note for your family (optional)')}
                placeholderTextColor={colors.muted}
                style={styles.input}
                maxLength={280}
                accessibilityLabel={tr('Note')}
              />
            )}
            <Button
              label={done ? tr('Mark as not done') : tr('Mark as done')}
              variant={done ? 'secondary' : 'primary'}
              disabled={busy}
              onPress={() =>
                save(done ? { done_at: null, done_by: null } : { done_at: new Date().toISOString(), done_by: me?.id ?? null, note: note.trim() || null })
              }
            />
          </Card>

          <View style={{ gap: 10 }}>
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
              {tr('HOW')}
            </T>
            {v.how.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.num}>
                  <T size={13} weight="bold" color={colors.walnut}>
                    {i + 1}
                  </T>
                </View>
                <T size={15} style={{ flex: 1, lineHeight: 22 }}>
                  {h}
                </T>
              </View>
            ))}
            {v.bring ? (
              <T size={14} color="#4A3F39" style={{ lineHeight: 20 }}>
                <T size={14} weight="bold">
                  {tr('Bring: ')}
                </T>
                {v.bring}
              </T>
            ) : null}
          </View>

          {v.tips.length ? (
            <View style={styles.tips}>
              <T size={12.5} weight="bold" color={colors.amberText} style={{ letterSpacing: 0.4 }}>
                {tr('TIPS')}
              </T>
              {v.tips.map((x, i) => (
                <T key={i} size={14} color="#4A3F39" style={{ lineHeight: 20 }}>
                  • {x}
                </T>
              ))}
            </View>
          ) : null}

          {step.place ? (
            <Card style={{ gap: 10 }}>
              <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
                {tr('WHERE TO GO')}
              </T>
              <T size={14} color="#4A3F39" style={{ lineHeight: 20 }}>
                {tr('Firdam opens the map with the nearest one, and how to get there by bus with live times.')}
              </T>
              <View style={styles.wrap}>
                <Pill label={tr('By bus')} on onPress={() => Linking.openURL(directionsUrl(step.place!, plan, 'transit'))} />
                <Pill label={tr('By car')} on={false} onPress={() => Linking.openURL(directionsUrl(step.place!, plan, 'driving'))} />
                <Pill label={tr('Walking')} on={false} onPress={() => Linking.openURL(directionsUrl(step.place!, plan, 'walking'))} />
              </View>
            </Card>
          ) : null}

          {step.opens === 'around' ? <Button label={tr('Open Getting around')} variant="secondary" onPress={() => onTab('around')} /> : null}
          {step.feature === 'halal' ? <Button label={tr('Open Halal places')} variant="secondary" onPress={() => { onClose(); router.push('/halal'); }} /> : null}
          {step.opens === 'discounts' ? <Button label={tr('See discounts')} variant="secondary" onPress={() => onTab('discount')} /> : null}

          {v.link ? (
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(v.link!.url)}>
              <T size={14} weight="bold" color={colors.walnut}>
                {tr('Official page: {0} ›', [v.link.label])}
              </T>
            </Pressable>
          ) : null}
          <T size={12} color={colors.muted} style={{ lineHeight: 17 }}>
            {tr('General guidance, not immigration or legal advice. Rules change: check the official page.')}
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── Getting around ────────────────────────────────────────────────── */

function Around({ country, plan, onDiscounts }: { country: NewcomerCountry; plan: NewcomerPlan; onDiscounts: () => void }) {
  const agency = transitFor(country, plan);
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 10 }}>
        <T size={17} weight="extrabold">
          {tr('Plan a trip by bus')}
        </T>
        <T size={14} color="#4A3F39" style={{ lineHeight: 20 }}>
          {tr('See the map, which bus to take, where to catch it and when it comes, with live times where your city shares them.')}
        </T>
        <Button label={tr('Open the trip planner')} onPress={() => Linking.openURL(tripPlannerUrl())} />
        {agency ? (
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(agency.url)} hitSlop={6}>
            <T size={14} weight="bold" color={colors.walnut}>
              {tr('{0}: fares, passes and service changes ›', [agency.agency])}
            </T>
          </Pressable>
        ) : null}
      </Card>

      <Card style={{ gap: 8 }}>
        <T size={15} weight="bold">
          {tr('Bus or Uber?')}
        </T>
        {[
          tr('One person or two: the bus is usually much cheaper. A transit card costs less than paying cash.'),
          tr('A family with young children: many cities let young children ride the bus free or for less. Check your city’s rules.'),
          tr('Taxi or Uber is faster door to door: good when it is very cold, late at night, or you have heavy bags.'),
          tr('Ask the driver or the app for the price first. In a taxi, check the meter is on.'),
        ].map((x, i) => (
          <T key={i} size={14} color="#4A3F39" style={{ lineHeight: 20 }}>
            • {x}
          </T>
        ))}
      </Card>

      <View style={styles.tips}>
        <T size={15} weight="bold" color={colors.amberText}>
          {tr('Car seats for children')}
        </T>
        <T size={14} color="#4A3F39" style={{ lineHeight: 20 }}>
          {tr('In Canada, babies and young children must ride in a car seat or booster that fits their age and size. Taxis and rides like Uber usually don’t bring one, so take yours, or choose the bus.')}
        </T>
      </View>

      <Card style={{ gap: 8 }}>
        <T size={15} weight="bold">
          {tr('Winter tips')}
        </T>
        {[tr('Leave earlier when it snows: buses can be late.'), tr('Wait inside the shelter and dress the children warmly: hat, mittens and boots.')].map((x, i) => (
          <T key={i} size={14} color="#4A3F39" style={{ lineHeight: 20 }}>
            • {x}
          </T>
        ))}
      </Card>

      <Button label={tr('See cheaper bus passes')} variant="secondary" onPress={onDiscounts} />
      <T size={12} color={colors.muted} style={{ lineHeight: 17 }}>
        {tr('Times come from your city’s transit system through the map. Firdam’s own live bus times, with warnings when a bus may not come, are coming next.')}
      </T>
    </View>
  );
}

/* ── Free help, discounts, deals ───────────────────────────────────── */

function HelpList({ items, kind }: { items: NewcomerHelp[]; kind: Exclude<Tab, 'plan'> }) {
  const lang = getLang();
  return (
    <View style={{ gap: 10 }}>
      <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>
        {kind === 'free'
          ? tr('Free help for newcomers, from the government, charities and mosques.')
          : kind === 'discount'
            ? tr('Most discounts depend on income, and many families qualify in their first year. Apply for each one.')
            : tr('Offers change often. Check the details on the company’s page before you sign up.')}
      </T>
      {items.map((h) => (
        <Card key={h.key} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T size={15} weight="bold" style={{ flex: 1 }}>
              {pick(h.title, lang)}
            </T>
            {kind === 'free' ? <Badge label={tr('Free')} tone="sage" /> : null}
          </View>
          <T size={13.5} color="#4A3F39" style={{ lineHeight: 19 }}>
            {pick(h.text, lang)}
          </T>
          <T size={12.5} color={colors.muted}>
            {pick(h.who, lang)}
          </T>
          {h.link ? (
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(h.link!)} hitSlop={6}>
              <T size={13.5} weight="bold" color={colors.walnut}>
                {kind === 'discount' ? tr('How to apply ›') : tr('Learn more ›')}
              </T>
            </Pressable>
          ) : h.feature === 'halal' ? (
            <Pressable accessibilityRole="link" onPress={() => router.push('/halal')} hitSlop={6}>
              <T size={13.5} weight="bold" color={colors.walnut}>
                {tr('Open Halal places ›')}
              </T>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

/* ── Small pieces ──────────────────────────────────────────────────── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
        {label}
      </T>
      {children}
    </View>
  );
}

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} disabled={!onPress} style={[styles.pill, on && styles.pillOn]}>
      <T size={14} weight={on ? 'bold' : 'semibold'} color={on ? colors.linen : colors.espresso}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  pillOn: { backgroundColor: colors.walnut, borderColor: colors.walnut },
  input: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.espresso },
  hero: { backgroundColor: colors.espresso, borderRadius: 20, padding: 16, gap: 10 },
  bar: { height: 8, backgroundColor: '#5A463E', borderRadius: 99 },
  barFill: { height: 8, backgroundColor: colors.goldText, borderRadius: 99 },
  row: { gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14 },
  open: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, marginStart: 38 },
  box: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  close: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.tint },
  note: { backgroundColor: colors.sageTint, borderRadius: 14, padding: 12 },
  doneBox: { backgroundColor: colors.sageTint, borderRadius: 12, padding: 12, gap: 4 },
  tips: { backgroundColor: colors.amberTint, borderRadius: 16, padding: 14, gap: 6 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
});
