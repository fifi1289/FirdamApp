import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/firdam-alert';
import { Badge, Chip, Segmented } from '@/components/kitchen-ui';
import { Button, Card, Field, T } from '@/components/ui';
import {
  type BudgetCategory,
  type BudgetTransaction,
  type SavingsGoal,
  deleteGoal,
  deleteTransaction,
  getCurrency,
  getZakatInputs,
  loadCategories,
  loadGoals,
  loadMonth,
  saveFitrInputs,
  saveGoal,
  saveTransaction,
  saveZakatInputs,
  setCategoryLimit,
  setCurrency as storeCurrency,
} from '@/lib/finance';
import { useKitchen } from '@/lib/kitchen-store';
import {
  CURRENCIES,
  EMPTY_ZAKAT,
  GOAL_KINDS,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  TRANSACTION_TYPES,
  ZAKAT_AL_FITR_NOTE,
  ZAKAT_ASSETS,
  ZAKAT_DESCRIPTIONS,
  computeZakatAlFitr,
  computeZakatAlMal,
  formatMoney,
  monthTotals,
  parseAmount,
  todayISO,
  type SavingsGoalKind,
  type TransactionType,
  type ZakatValues,
} from '@/shared/finance-core';
import { colors } from '@/theme';

type Tab = 'overview' | 'savings' | 'zakat';
type EntryDraft = { id?: string; type: TransactionType; amount: string; category_id: string | null; description: string; occurred_on: string };

const TYPE_TONE: Record<TransactionType, 'sage' | 'brick' | 'amber' | 'walnut'> = { income: 'sage', expense: 'brick', sadaqah: 'amber', zakat: 'walnut' };
const typeLabel = (t: TransactionType) => TRANSACTION_TYPES.find((x) => x.value === t)?.label ?? t;

/** Finance & zakat — the same data and rules as the website's Finance page. */
export default function FinanceScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'zakat' || params.tab === 'savings' ? params.tab : 'overview');
  const [currency, setCurrencyState] = useState('CAD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [entry, setEntry] = useState<EntryDraft | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getCurrency().then(setCurrencyState);
    loadCategories().then(setCategories).catch(() => {});
  }, []);

  const newEntry = (initial?: Partial<EntryDraft>) =>
    setEntry({ type: 'expense', amount: '', category_id: null, description: '', occurred_on: todayISO(), ...initial });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <T weight="extrabold" size={22} accessibilityRole="header">
          Finance
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Currency ${currency}. Change`} onPress={() => setCurrencyOpen(true)} style={styles.currency}>
            <T size={13} weight="bold" color={colors.walnut}>
              {currency} ▾
            </T>
          </Pressable>
          <Button label="Done" variant="text" onPress={() => router.back()} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Segmented
          options={[
            { key: 'overview', label: 'Overview' },
            { key: 'savings', label: 'Savings' },
            { key: 'zakat', label: 'Zakat' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {tab === 'overview' ? (
          <Overview key={refreshKey} currency={currency} categories={categories} setCategories={setCategories} onNew={newEntry} onEdit={(t) => setEntry({ ...t, amount: String(t.amount), description: t.description ?? '' })} />
        ) : tab === 'savings' ? (
          <Savings currency={currency} />
        ) : (
          <Zakat currency={currency} onRecord={(amount, description) => newEntry({ type: 'zakat', amount: String(amount), description })} />
        )}
      </ScrollView>

      {entry ? (
        <EntrySheet
          draft={entry}
          categories={categories}
          currency={currency}
          onClose={() => setEntry(null)}
          onSaved={() => {
            setEntry(null);
            setTab('overview');
            setRefreshKey((n) => n + 1);
          }}
        />
      ) : null}

      <Sheet open={currencyOpen} onClose={() => setCurrencyOpen(false)} title="Currency">
        <View style={styles.wrap}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={c === currency}
              onPress={() => {
                setCurrencyState(c);
                storeCurrency(c);
                setCurrencyOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

// ---------- Overview ----------

function Overview({
  currency,
  categories,
  setCategories,
  onNew,
  onEdit,
}: {
  currency: string;
  categories: BudgetCategory[];
  setCategories: (c: BudgetCategory[]) => void;
  onNew: (initial?: Partial<EntryDraft>) => void;
  onEdit: (t: BudgetTransaction) => void;
}) {
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [rows, setRows] = useState<BudgetTransaction[] | null>(null);
  const [limitFor, setLimitFor] = useState<BudgetCategory | null>(null);

  const load = useCallback(() => {
    setRows(null);
    loadMonth(period.year, period.month)
      .then(setRows)
      .catch((e) => {
        setRows([]);
        showAlert('Could not load this month', e instanceof Error ? e.message : undefined);
      });
  }, [period]);
  useEffect(load, [load]);

  const totals = useMemo(() => monthTotals(rows ?? [], categories), [rows, categories]);
  const shift = (d: number) =>
    setPeriod((p) => {
      const x = new Date(p.year, p.month - 1 + d, 1);
      return { year: x.getFullYear(), month: x.getMonth() + 1 };
    });
  const monthLabel = new Date(period.year, period.month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? 'Uncategorised' : null);

  return (
    <>
      <View style={styles.month}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shift(-1)} hitSlop={10} style={styles.monthBtn}>
          <T size={20} color={colors.walnut}>‹</T>
        </Pressable>
        <T weight="bold" size={16}>
          {monthLabel}
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shift(1)} hitSlop={10} style={styles.monthBtn}>
          <T size={20} color={colors.walnut}>›</T>
        </Pressable>
      </View>

      <View style={styles.stats}>
        <Stat label="Income" value={formatMoney(totals.income, currency)} tone={colors.sage} />
        <Stat label="Spent" value={formatMoney(totals.expense, currency)} tone={colors.brickText} sub={totals.budgetLeft != null ? `${formatMoney(Math.abs(totals.budgetLeft), currency)} ${totals.budgetLeft >= 0 ? 'left' : 'over'}` : undefined} />
        <Stat label="Sadaqah & zakat" value={formatMoney(totals.giving, currency)} tone={colors.amberText} sub={totals.income > 0 ? `${((totals.giving / totals.income) * 100).toFixed(1)}% of income` : undefined} />
        <Stat label="Balance" value={formatMoney(totals.balance, currency)} tone={colors.espresso} />
      </View>

      <Button label="Add entry" onPress={() => onNew()} />

      <Card style={{ gap: 4 }}>
        <View style={styles.cardHead}>
          <T weight="bold" size={16}>
            This month&apos;s entries
          </T>
          <Pressable accessibilityRole="button" onPress={() => onNew({ type: 'sadaqah' })} hitSlop={8}>
            <T size={13} weight="bold" color={colors.walnut}>
              + Log sadaqah
            </T>
          </Pressable>
        </View>
        {!rows ? (
          <ActivityIndicator color={colors.walnut} style={{ marginVertical: 16 }} />
        ) : rows.length === 0 ? (
          <T size={13.5} color={colors.muted} style={{ paddingVertical: 10 }}>
            No entries for {monthLabel}. Add your income and expenses to see where your money goes.
          </T>
        ) : (
          rows.map((t, i) => (
            <Pressable key={t.id} accessibilityRole="button" accessibilityHint="Edit this entry" onPress={() => onEdit(t)} style={[styles.row, i < rows.length - 1 && styles.rowLine]}>
              <View style={{ flex: 1, gap: 3 }}>
                <T weight="semibold" size={14.5} numberOfLines={1}>
                  {t.description || categoryName(t.category_id) || typeLabel(t.type)}
                </T>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Badge label={typeLabel(t.type)} tone={TYPE_TONE[t.type]} />
                  <T size={12} color={colors.muted}>
                    {new Date(`${t.occurred_on}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </T>
                </View>
              </View>
              <T weight="bold" size={15} color={t.type === 'income' ? colors.sage : colors.espresso}>
                {t.type === 'income' ? '+' : '−'}
                {formatMoney(Number(t.amount), currency)}
              </T>
            </Pressable>
          ))
        )}
      </Card>

      <Card style={{ gap: 2 }}>
        <View style={styles.cardHead}>
          <T weight="bold" size={16}>
            Category budgets
          </T>
          <T size={12} color={colors.muted}>
            Tap to set a monthly limit
          </T>
        </View>
        {categories.map((c, i) => {
          const spent = totals.byCategory.get(c.id) ?? 0;
          const limit = c.monthly_limit ? Number(c.monthly_limit) : null;
          const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
          const over = limit != null && spent > limit;
          return (
            <Pressable key={c.id} accessibilityRole="button" onPress={() => setLimitFor(c)} style={[{ paddingVertical: 10, gap: 6 }, i < categories.length - 1 && styles.rowLine]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T size={14.5} weight="semibold">
                  {c.name}
                </T>
                <T size={13} color={over ? colors.brickText : colors.muted}>
                  {formatMoney(spent, currency)}
                  {limit ? ` / ${formatMoney(limit, currency)}` : ' · set limit'}
                </T>
              </View>
              {limit ? (
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: over ? colors.brickText : pct >= 85 ? colors.gold : colors.sage }]} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </Card>

      <LimitSheet
        category={limitFor}
        currency={currency}
        onClose={() => setLimitFor(null)}
        onSave={async (limit) => {
          const c = limitFor!;
          setCategories(categories.map((x) => (x.id === c.id ? { ...x, monthly_limit: limit } : x)));
          setLimitFor(null);
          await setCategoryLimit(c.id, limit).catch(() => showAlert('Could not update the limit'));
        }}
      />
    </>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <View style={styles.stat}>
      <T size={12} weight="bold" color={colors.muted} style={{ letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </T>
      <T size={19} weight="extrabold" color={tone} numberOfLines={1}>
        {value}
      </T>
      {sub ? (
        <T size={11.5} color={colors.muted} numberOfLines={1}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

// ---------- Savings goals ----------

function Savings({ currency }: { currency: string }) {
  const k = useKitchen();
  const [goals, setGoals] = useState<SavingsGoal[] | null>(null);
  const [editing, setEditing] = useState<Partial<SavingsGoal> | null>(null);
  const [adding, setAdding] = useState<Record<string, string>>({});
  const load = () => loadGoals().then(setGoals).catch(() => setGoals([]));
  useEffect(() => {
    load();
  }, []);
  // The free plan includes one savings goal (same as the website).
  const atLimit = !k.paid && (goals?.length ?? 0) >= 1;

  const contribute = async (g: SavingsGoal) => {
    const add = parseAmount(adding[g.id]);
    if (!add) return;
    const saved = Number(g.saved) + add;
    setAdding((a) => ({ ...a, [g.id]: '' }));
    setGoals((list) => list?.map((x) => (x.id === g.id ? { ...x, saved } : x)) ?? null);
    try {
      await saveGoal({ name: g.name, kind: g.kind, target: Number(g.target), saved, target_date: g.target_date }, g.id);
      if (saved >= Number(g.target) && Number(g.saved) < Number(g.target)) showAlert('MashaAllah!', `You reached your ${g.name} goal.`);
    } catch {
      showAlert('Could not update the goal');
      load();
    }
  };

  if (!goals) return <ActivityIndicator color={colors.walnut} />;
  return (
    <>
      <T size={14} color={colors.muted}>
        Save for Hajj, Umrah, Eid, a home or an emergency fund, and watch it grow.
      </T>
      {goals.map((g) => {
        const target = Number(g.target);
        const pct = target > 0 ? Math.min(100, (Number(g.saved) / target) * 100) : 0;
        const kind = GOAL_KINDS.find((x) => x.value === g.kind);
        return (
          <Card key={g.id} style={{ gap: 10 }}>
            <Pressable accessibilityRole="button" accessibilityHint="Edit this goal" onPress={() => setEditing(g)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <T size={26}>{kind?.emoji ?? '✨'}</T>
              <View style={{ flex: 1 }}>
                <T weight="bold" size={16}>
                  {g.name}
                </T>
                <T size={13} color={colors.muted}>
                  {formatMoney(Number(g.saved), currency)} of {formatMoney(target, currency)}
                  {g.target_date ? ` · by ${new Date(`${g.target_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
                </T>
              </View>
              <T size={13} weight="bold" color={colors.walnut}>
                Edit
              </T>
            </Pressable>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.sage : colors.walnut }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={adding[g.id] ?? ''}
                onChangeText={(v) => setAdding((a) => ({ ...a, [g.id]: v }))}
                placeholder={`Add (${currency})`}
                placeholderTextColor="#9C8D84"
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1 }]}
                accessibilityLabel={`Amount to add to ${g.name}`}
              />
              <Pressable accessibilityRole="button" onPress={() => contribute(g)} style={styles.smallBtn}>
                <T weight="bold" color={colors.white}>
                  Add
                </T>
              </Pressable>
            </View>
          </Card>
        );
      })}
      {atLimit ? (
        <Card>
          <T size={13.5} color={colors.muted}>
            The free plan includes one savings goal. More goals are coming with Firdam Family.
          </T>
        </Card>
      ) : (
        <Button label="New savings goal" variant={goals.length ? 'secondary' : 'primary'} onPress={() => setEditing({ kind: 'hajj' })} />
      )}

      {editing ? (
        <GoalSheet
          goal={editing}
          currency={currency}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      ) : null}
    </>
  );
}

// ---------- Zakat ----------

function Zakat({ currency, onRecord }: { currency: string; onRecord: (amount: number, description: string) => void }) {
  const k = useKitchen();
  const [values, setValues] = useState<ZakatValues>(EMPTY_ZAKAT);
  const [basis, setBasis] = useState<'silver' | 'gold'>('silver');
  const [fitr, setFitr] = useState({ people: '', perPerson: '' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getZakatInputs().then((z) => {
      setValues(z.values);
      setBasis(z.basis);
      setFitr(z.fitr);
      setReady(true);
    });
  }, []);
  // Everyone in the family by default.
  useEffect(() => {
    if (ready && !fitr.people && k.household?.people) setFitr((f) => ({ ...f, people: String(k.household!.people) }));
  }, [ready, k.household, fitr.people]);

  const set = (key: keyof ZakatValues, v: string) => {
    const next = { ...values, [key]: v };
    setValues(next);
    saveZakatInputs(next, basis);
  };
  const mal = computeZakatAlMal(values, basis);
  const fitrResult = computeZakatAlFitr(Number(fitr.people), fitr.perPerson);
  const updateFitr = (next: typeof fitr) => {
    setFitr(next);
    saveFitrInputs(next);
  };

  if (!ready) return <ActivityIndicator color={colors.walnut} />;
  return (
    <>
      <View style={styles.private}>
        <T size={12.5} color={colors.sageDark}>
          🔒 Private to this phone. Your savings, gold and other amounts are only saved on this device. Only a zakat payment you record goes to your account.
        </T>
      </View>

      <Card style={{ gap: 12 }}>
        <T weight="extrabold" size={18}>
          Zakat al-mal
        </T>
        <T size={13} color={colors.muted}>
          2.5% of wealth held for a full lunar year (hawl) above the nisab. Your home, car and personal items are not included.
        </T>
        <T weight="bold" size={14}>
          1. Today&apos;s metal prices ({currency} per gram)
        </T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Gold" value={values.goldPrice} onChangeText={(v) => set('goldPrice', v)} keyboardType="decimal-pad" placeholder="0.00" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Silver" value={values.silverPrice} onChangeText={(v) => set('silverPrice', v)} keyboardType="decimal-pad" placeholder="0.00" />
          </View>
        </View>
        <View style={styles.wrap}>
          {(['silver', 'gold'] as const).map((b) => (
            <Chip
              key={b}
              label={`${b === 'silver' ? 'Silver' : 'Gold'} nisab (${b === 'silver' ? SILVER_NISAB_GRAMS : GOLD_NISAB_GRAMS} g)`}
              selected={basis === b}
              onPress={() => {
                setBasis(b);
                saveZakatInputs(values, b);
              }}
            />
          ))}
        </View>
        <T size={12} color={colors.muted}>
          Many scholars recommend the silver nisab as it benefits more people in need. Follow the opinion you trust.
        </T>
        <T weight="bold" size={14}>
          2. What you own
        </T>
        {ZAKAT_ASSETS.map((a) => (
          <Field key={a.key} label={a.hint ? `${a.label} — ${a.hint.toLowerCase()}` : a.label} value={values[a.key]} onChangeText={(v) => set(a.key, v)} keyboardType="decimal-pad" placeholder="0" />
        ))}
        <T weight="bold" size={14}>
          3. What you owe now
        </T>
        <Field label="Debts and bills due now" value={values.debts} onChangeText={(v) => set('debts', v)} keyboardType="decimal-pad" placeholder="0" />

        <View style={styles.result}>
          <T size={12} weight="bold" color={colors.goldText} style={{ letterSpacing: 0.4 }}>
            ZAKAT AL-MAL DUE
          </T>
          <T size={32} weight="extrabold" color={colors.white}>
            {formatMoney(mal.due, currency)}
          </T>
          <T size={13} color={colors.goldText}>
            {!mal.hasNisab
              ? `Enter the ${basis} price to check the nisab.`
              : mal.due > 0
                ? `2.5% of ${formatMoney(mal.net, currency)} · nisab ${formatMoney(mal.nisab, currency)}`
                : `Below the nisab (${formatMoney(mal.nisab, currency)}): no zakat al-mal is due.`}
          </T>
        </View>
        {mal.due > 0 ? <Button label="Record as zakat al-mal paid" onPress={() => onRecord(Math.round(mal.due * 100) / 100, ZAKAT_DESCRIPTIONS.mal)} /> : null}
        <T size={12} color={colors.muted}>
          A guide to help you estimate. For gold jewellery, pensions, rental property and other special cases, consult a scholar you trust.
        </T>
      </Card>

      <Card style={{ gap: 12 }}>
        <T weight="extrabold" size={18}>
          Zakat al-fitr
        </T>
        <T size={13} color={colors.muted}>
          {ZAKAT_AL_FITR_NOTE}
        </T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="People" value={fitr.people} onChangeText={(v) => updateFitr({ ...fitr, people: v })} keyboardType="number-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={`Per person (${currency})`} value={fitr.perPerson} onChangeText={(v) => updateFitr({ ...fitr, perPerson: v })} keyboardType="decimal-pad" placeholder="e.g. 15" />
          </View>
        </View>
        <View style={[styles.result, { backgroundColor: colors.tint }]}>
          <T size={12} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
            ZAKAT AL-FITR DUE
          </T>
          <T size={28} weight="extrabold">
            {formatMoney(fitrResult.total, currency)}
          </T>
          <T size={13} color={colors.muted}>
            {fitrResult.total > 0 ? `${fitrResult.people} × ${formatMoney(fitrResult.perPerson, currency)} · pay before the Eid prayer` : 'Enter the number of people and the amount per person.'}
          </T>
        </View>
        {fitrResult.total > 0 ? (
          <Button label="Record as zakat al-fitr paid" variant="secondary" onPress={() => onRecord(Math.round(fitrResult.total * 100) / 100, ZAKAT_DESCRIPTIONS.fitr)} />
        ) : null}
      </Card>
    </>
  );
}

// ---------- Sheets ----------

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
          <Pressable style={styles.sheetWrap} onPress={() => {}}>
            <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled" bounces={false}>
              <T weight="extrabold" size={20}>
                {title}
              </T>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EntrySheet({ draft, categories, currency, onClose, onSaved }: { draft: EntryDraft; categories: BudgetCategory[]; currency: string; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    const amount = parseAmount(d.amount);
    if (!amount) return setProblem('Enter an amount.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.occurred_on)) return setProblem('Use the date format YYYY-MM-DD.');
    setBusy(true);
    try {
      await saveTransaction(
        { type: d.type, amount, category_id: d.type === 'expense' ? d.category_id : null, description: d.description.trim() || null, occurred_on: d.occurred_on },
        d.id,
      );
      onSaved();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!d.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await deleteTransaction(d.id);
      onSaved();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not delete.');
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={d.id ? 'Edit entry' : 'New entry'}>
      <View style={styles.wrap}>
        {TRANSACTION_TYPES.map((t) => (
          <Chip key={t.value} label={t.label} selected={d.type === t.value} onPress={() => setD({ ...d, type: t.value })} />
        ))}
      </View>
      <Field label={`Amount (${currency})`} value={d.amount} onChangeText={(v) => setD({ ...d, amount: v })} keyboardType="decimal-pad" placeholder="0.00" autoFocus={!d.id && !d.amount} />
      {d.type === 'expense' ? (
        <View style={{ gap: 6 }}>
          <T weight="semibold" size={14}>
            Category
          </T>
          <View style={styles.wrap}>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} selected={d.category_id === c.id} onPress={() => setD({ ...d, category_id: d.category_id === c.id ? null : c.id })} />
            ))}
          </View>
        </View>
      ) : null}
      <Field label="Note (optional)" value={d.description} onChangeText={(v) => setD({ ...d, description: v })} placeholder={d.type === 'sadaqah' ? 'e.g. Masjid fundraiser' : 'e.g. Costco'} />
      <Field label="Date (YYYY-MM-DD)" value={d.occurred_on} onChangeText={(v) => setD({ ...d, occurred_on: v })} keyboardType="numbers-and-punctuation" />
      {problem ? (
        <T size={13.5} color={colors.brickText}>
          {problem}
        </T>
      ) : null}
      <Button label={d.id ? 'Save changes' : 'Add entry'} onPress={save} busy={busy} />
      {d.id ? <Button label={confirmDelete ? 'Tap again to delete' : 'Delete entry'} variant="text" onPress={remove} /> : null}
      <Button label="Cancel" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

function LimitSheet({ category, currency, onClose, onSave }: { category: BudgetCategory | null; currency: string; onClose: () => void; onSave: (limit: number | null) => void }) {
  const [value, setValue] = useState('');
  useEffect(() => setValue(category?.monthly_limit ? String(category.monthly_limit) : ''), [category]);
  return (
    <Sheet open={!!category} onClose={onClose} title={category ? `${category.name}: monthly limit` : ''}>
      <Field label={`Limit (${currency}), empty for none`} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="e.g. 600" autoFocus />
      <Button label="Save" onPress={() => onSave(parseAmount(value) || null)} />
      <Button label="Cancel" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

function GoalSheet({ goal, currency, onClose, onSaved }: { goal: Partial<SavingsGoal>; currency: string; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<SavingsGoalKind>(goal.kind ?? 'hajj');
  const [name, setName] = useState(goal.name ?? '');
  const [target, setTarget] = useState(goal.target ? String(goal.target) : '');
  const [saved, setSaved] = useState(goal.saved ? String(goal.saved) : '');
  const [date, setDate] = useState(goal.target_date ?? '');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    const t = parseAmount(target);
    const label = name.trim() || GOAL_KINDS.find((g) => g.value === kind)?.label || 'Goal';
    if (!t) return setProblem('Enter how much you want to save.');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return setProblem('Use the date format YYYY-MM-DD.');
    setBusy(true);
    try {
      await saveGoal({ name: label, kind, target: t, saved: parseAmount(saved), target_date: date || null }, goal.id);
      onSaved();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not save the goal.');
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!goal.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await deleteGoal(goal.id);
      onSaved();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not delete the goal.');
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={goal.id ? 'Edit goal' : 'New savings goal'}>
      <View style={styles.wrap}>
        {GOAL_KINDS.map((g) => (
          <Chip key={g.value} label={`${g.emoji} ${g.label}`} selected={kind === g.value} onPress={() => setKind(g.value)} />
        ))}
      </View>
      <Field label="Name" value={name} onChangeText={setName} placeholder={GOAL_KINDS.find((g) => g.value === kind)?.label} />
      <Field label={`Target (${currency})`} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="e.g. 12000" />
      <Field label={`Saved so far (${currency})`} value={saved} onChangeText={setSaved} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Target date (optional, YYYY-MM-DD)" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="2027-06-01" />
      {problem ? (
        <T size={13.5} color={colors.brickText}>
          {problem}
        </T>
      ) : null}
      <Button label={goal.id ? 'Save changes' : 'Create goal'} onPress={save} busy={busy} />
      {goal.id ? <Button label={confirmDelete ? 'Tap again to delete' : 'Delete goal'} variant="text" onPress={remove} /> : null}
      <Button label="Cancel" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  currency: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.tint },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 4 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.tint, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 15, color: colors.espresso },
  smallBtn: { height: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.walnut, alignItems: 'center', justifyContent: 'center' },
  private: { backgroundColor: colors.sageTint, borderRadius: 14, padding: 12 },
  result: { backgroundColor: colors.espresso, borderRadius: 18, padding: 16, gap: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(40,28,20,0.35)', justifyContent: 'flex-end' },
  sheetWrap: { backgroundColor: colors.linen, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheet: { padding: 20, gap: 12, paddingBottom: 34 },
});
