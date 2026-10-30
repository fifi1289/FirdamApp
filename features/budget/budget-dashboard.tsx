'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { BudgetCategory, BudgetTransaction } from '@/types/database';
import {
  CATEGORY_ICON_MAP,
  COMMON_CURRENCIES,
  CURRENCY_LIST,
  currencyName,
  DEFAULT_CATEGORIES,
  formatMoney,
  monthBounds,
  useCurrency,
} from '@/features/budget/budget-config';
import { CategoryDialog } from '@/features/budget/category-dialog';
import { TransactionDialog } from '@/features/budget/transaction-dialog';
import { ZakatCalculator } from '@/features/budget/zakat-calculator';
import { SavingsGoals } from '@/features/budget/savings-goals';
import { locale, tr, trn } from '@/lib/i18n';

// Guards against seeding twice when effects run twice (React Strict Mode).
let seedingCategories: Promise<BudgetCategory[]> | null = null;

function SummaryTile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Wallet;
  tone: 'default' | 'positive' | 'negative' | 'giving';
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{trn(label)}</p>
          <span
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg',
              tone === 'positive' && 'bg-brand-sage/15 text-brand-sage',
              tone === 'negative' && 'bg-destructive/10 text-destructive',
              tone === 'giving' && 'bg-brand-gold/20 text-[#8a6537] dark:text-brand-gold',
              tone === 'default' && 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight tabular-nums text-foreground">
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{trn(sub)}</p>}
      </CardContent>
    </Card>
  );
}

function CategoryBudgetRow({
  category,
  spent,
  currency,
  onOpen,
}: {
  category: BudgetCategory;
  spent: number;
  currency: string;
  onOpen: (c: BudgetCategory) => void;
}) {
  const Icon = CATEGORY_ICON_MAP[category.icon] ?? Wallet;
  const limit = category.monthly_limit ? Number(category.monthly_limit) : null;
  const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
  const over = limit !== null && spent > limit;
  const near = limit !== null && !over && spent >= limit * 0.85;

  return (
    <button
      type="button"
      onClick={() => onOpen(category)}
      className="flex w-full items-center gap-3 rounded-lg py-3 text-left transition-colors hover:bg-muted/40"
      aria-label={tr('Edit {0}', [category.name])}
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{trn(category.name)}</p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            <span className={cn('font-medium', over ? 'text-destructive' : 'text-foreground')}>
              {formatMoney(spent, currency)}
            </span>
            {limit ? ` / ${formatMoney(limit, currency)}` : tr(' · set limit')}
          </span>
        </div>
        {limit !== null && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                over ? 'bg-destructive' : near ? 'bg-warning' : 'bg-brand-sage'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </button>
  );
}

export function BudgetDashboard() {
  const supabase = createSupabaseBrowserClient();
  const { currency, setCurrency } = useCurrency();
  const today = new Date();
  const [period, setPeriod] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] = useState<Partial<BudgetTransaction> | null>(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && ['overview', 'goals', 'zakat'].includes(t)) setTab(t);
  }, []);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .order('position', { ascending: true });
    if (error) {
      console.error('Failed to load categories:', error.message);
      return;
    }
    if (data && data.length > 0) {
      setCategories(data);
      return;
    }
    seedingCategories ??= Promise.resolve(
      supabase
        .from('budget_categories')
        .insert(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, position: i })))
        .select()
    ).then(({ data: created, error: seedError }) => {
      if (seedError) console.error('Failed to create categories:', seedError.message);
      return created ?? [];
    });
    const created = await seedingCategories;
    setCategories(created);
  }, [supabase]);

  const loadTransactions = useCallback(async () => {
    const { start, end } = monthBounds(period.year, period.month);
    const { data, error } = await supabase
      .from('budget_transactions')
      .select('*')
      .gte('occurred_on', start)
      .lte('occurred_on', end)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) console.error('Failed to load transactions:', error.message);
    setTransactions(data ?? []);
    setLoading(false);
  }, [supabase, period]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setLoading(true);
    loadTransactions();
  }, [loadTransactions]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let giving = 0;
    const byCategory = new Map<string, number>();
    for (const t of transactions) {
      const a = Number(t.amount);
      if (t.type === 'income') income += a;
      else if (t.type === 'expense') {
        expense += a;
        const key = t.category_id ?? 'none';
        byCategory.set(key, (byCategory.get(key) ?? 0) + a);
      } else giving += a;
    }
    const plannedLimit = categories.reduce((s, c) => s + (c.monthly_limit ? Number(c.monthly_limit) : 0), 0);
    return { income, expense, giving, byCategory, plannedLimit };
  }, [transactions, categories]);

  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category: BudgetCategory | null }>({ open: false, category: null });

  const saveCategory = async (values: { name: string; monthly_limit: number | null }) => {
    const editing = categoryDialog.category;
    const { error } = editing
      ? await supabase.from('budget_categories').update(values).eq('id', editing.id)
      : await supabase
          .from('budget_categories')
          .insert({ ...values, icon: 'wallet', position: categories.reduce((m, c) => Math.max(m, c.position), 0) + 1 });
    if (error) throw new Error(error.message);
    await loadCategories();
  };

  const deleteCategory = async () => {
    const c = categoryDialog.category;
    if (!c) return;
    const { error } = await supabase.from('budget_categories').delete().eq('id', c.id);
    if (error) throw new Error(error.message);
    await Promise.all([loadCategories(), loadTransactions()]);
  };

  const deleteTransaction = async (t: BudgetTransaction) => {
    setTransactions((prev) => prev.filter((x) => x.id !== t.id));
    const { error } = await supabase.from('budget_transactions').delete().eq('id', t.id);
    if (error) {
      toast.error(tr('Could not delete entry'));
      loadTransactions();
    }
  };

  const openNew = (initial?: Partial<BudgetTransaction>) => {
    setDialogInitial(initial ?? null);
    setDialogOpen(true);
  };

  const monthLabel = new Date(period.year, period.month - 1, 1).toLocaleDateString(locale(), {
    month: 'long',
    year: 'numeric',
  });
  const shift = (delta: number) =>
    setPeriod((p) => {
      const d = new Date(p.year, p.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  const categoryName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name ?? tr('Uncategorised') : null;

  const balance = totals.income - totals.expense - totals.giving;
  const budgetLeft = totals.plannedLimit > 0 ? totals.plannedLimit - totals.expense : null;

  return (
    <AppShell>
      <PageHeader
        title={tr('Finance')}
        description={tr('Spend with intention, save for what matters, and keep track of your giving.')}
      >
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="h-9 w-[96px]" aria-label={tr('Currency: {0}', [currencyName(currency)])}>
            <SelectValue>{trn(currency)}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectGroup>
              <SelectLabel>{tr('Common')}</SelectLabel>
              {COMMON_CURRENCIES.map((c) => (
                <SelectItem key={`common-${c}`} value={c}>
                  {trn(c)} · {currencyName(c)}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{tr('All currencies')}</SelectLabel>
              {CURRENCY_LIST.filter((c) => !COMMON_CURRENCIES.includes(c.code)).map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {trn(c.code)} · {trn(c.name)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => openNew({ type: 'income' })}>
          <ArrowDownLeft className="mr-2 h-4 w-4" />
          {tr('Add income')}
        </Button>
        <Button size="sm" onClick={() => openNew({ type: 'expense' })}>
          <Plus className="mr-2 h-4 w-4" />
          {tr('Add expense')}
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="overview">{tr('Overview')}</TabsTrigger>
          <TabsTrigger value="goals">{tr('Savings goals')}</TabsTrigger>
          <TabsTrigger value="zakat">{tr('Zakat calculator')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="mb-4 flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label={tr('Previous month')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-[140px] text-center text-sm font-semibold text-foreground">{trn(monthLabel)}</p>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label={tr('Next month')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label={tr('Income')}
              value={formatMoney(totals.income, currency)}
              icon={ArrowDownLeft}
              tone="positive"
            />
            <SummaryTile
              label={tr('Spent')}
              value={formatMoney(totals.expense, currency)}
              sub={
                budgetLeft !== null
                  ? budgetLeft >= 0
                    ? tr('{0} left of your budget', [formatMoney(budgetLeft, currency)])
                    : tr('{0} over budget', [formatMoney(-budgetLeft, currency)])
                  : tr('Set category limits to plan your month')
              }
              icon={ArrowUpRight}
              tone="negative"
            />
            <SummaryTile
              label={tr('Sadaqah & zakat')}
              value={formatMoney(totals.giving, currency)}
              sub={totals.income > 0 ? tr('{0}% of income', [((totals.giving / totals.income) * 100).toFixed(1)]) : trn(undefined)}
              icon={HandHeart}
              tone="giving"
            />
            <SummaryTile
              label={tr('Balance')}
              value={formatMoney(balance, currency)}
              sub={tr('Income minus spending and giving')}
              icon={Wallet}
              tone="default"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.1fr]">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{tr('Category budgets')}</h2>
                    <p className="text-xs text-muted-foreground">{tr('Click a category to rename it, set a limit or remove it')}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCategoryDialog({ open: true, category: null })}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    {tr('Add category')}
                  </Button>
                </div>
                <div className="mt-2 divide-y divide-border/70">
                  {categories.map((c) => (
                    <CategoryBudgetRow
                      key={c.id}
                      category={c}
                      spent={totals.byCategory.get(c.id) ?? 0}
                      currency={currency}
                      onOpen={(category) => setCategoryDialog({ open: true, category })}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">{tr('This month\'s entries')}</h2>
                  <Button variant="ghost" size="sm" onClick={() => openNew({ type: 'sadaqah' })}>
                    <HandHeart className="mr-1.5 h-4 w-4" />
                    {tr('Log sadaqah')}
                  </Button>
                </div>
                {loading ? (
                  <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {tr('Loading…')}
                  </p>
                ) : transactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-medium text-foreground">{tr('No entries for')} {trn(monthLabel)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tr('Add your income and expenses to see where your money goes.')}
                    </p>
                    <Button size="sm" className="mt-4" onClick={() => openNew()}>
                      <Plus className="mr-2 h-4 w-4" />
                      {tr('Add entry')}
                    </Button>
                  </div>
                ) : (
                  <ul className="mt-2 divide-y divide-border/70">
                    {transactions.map((t) => {
                      const isIn = t.type === 'income';
                      const isGiving = t.type === 'sadaqah' || t.type === 'zakat';
                      return (
                        <li key={t.id} className="group flex items-center gap-3 py-2.5">
                          <span
                            className={cn(
                              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                              isIn
                                ? 'bg-brand-sage/15 text-brand-sage'
                                : isGiving
                                  ? 'bg-brand-gold/20 text-[#8a6537] dark:text-brand-gold'
                                  : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {isIn ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : isGiving ? (
                              <HandHeart className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {trn(t.description) ||
                                (isIn ? tr('Income') : isGiving ? (t.type === 'zakat' ? tr('Zakat') : tr('Sadaqah')) : categoryName(t.category_id) ?? tr('Expense'))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(`${t.occurred_on}T00:00:00`).toLocaleDateString(locale(), {
                                month: 'short',
                                day: 'numeric',
                              })}
                              {t.type === 'expense' && t.description && categoryName(t.category_id)
                                ? ` · ${categoryName(t.category_id)}`
                                : ''}
                              {isGiving ? ` · ${t.type === 'zakat' ? 'Zakat' : 'Sadaqah'}` : ''}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-semibold tabular-nums',
                              isIn ? 'text-brand-sage' : 'text-foreground'
                            )}
                          >
                            {isIn ? '+' : '−'}
                            {formatMoney(Number(t.amount), currency)}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-60 group-hover:opacity-100"
                                aria-label={tr('Entry actions')}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openNew(t)}>
                                <Pencil className="mr-2 h-4 w-4" /> {tr('Edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => deleteTransaction(t)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> {tr('Delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="mt-0">
          <SavingsGoals currency={currency} />
        </TabsContent>

        <TabsContent value="zakat" className="mt-0">
          <ZakatCalculator
            currency={currency}
            onRecord={(amount, description) => openNew({ type: 'zakat', amount, description })}
          />
        </TabsContent>
      </Tabs>

      <CategoryDialog
        open={categoryDialog.open}
        category={categoryDialog.category}
        currency={currency}
        onOpenChange={(open) => setCategoryDialog((d) => ({ ...d, open }))}
        onSave={saveCategory}
        onDelete={deleteCategory}
        onAddExpense={() => categoryDialog.category && openNew({ type: 'expense', category_id: categoryDialog.category.id })}
      />
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        currency={currency}
        initial={dialogInitial}
        onSaved={() => {
          loadTransactions();
          if (tab === 'zakat') setTab('overview');
        }}
      />
    </AppShell>
  );
}
