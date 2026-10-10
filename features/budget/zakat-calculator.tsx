'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info, Lock, Scale } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/features/budget/budget-config';

const STORAGE_KEY = 'firdam.zakat.inputs';

const GOLD_NISAB_GRAMS = 85;
const SILVER_NISAB_GRAMS = 595;
const ZAKAT_RATE = 0.025;

type Field =
  | 'cash'
  | 'bank'
  | 'goldValue'
  | 'silverValue'
  | 'investments'
  | 'business'
  | 'receivables'
  | 'debts'
  | 'goldPrice'
  | 'silverPrice';

const ASSETS: { key: Field; label: string; hint?: string }[] = [
  { key: 'cash', label: 'Cash at home' },
  { key: 'bank', label: 'Bank accounts', hint: 'Current and savings balances' },
  { key: 'goldValue', label: 'Gold you own', hint: 'Current market value' },
  { key: 'silverValue', label: 'Silver you own', hint: 'Current market value' },
  { key: 'investments', label: 'Shares & investments', hint: 'Zakatable portion' },
  { key: 'business', label: 'Business stock & cash' },
  { key: 'receivables', label: 'Money owed to you', hint: 'That you expect to receive' },
];

type Values = Record<Field, string>;

const EMPTY: Values = {
  cash: '',
  bank: '',
  goldValue: '',
  silverValue: '',
  investments: '',
  business: '',
  receivables: '',
  debts: '',
  goldPrice: '',
  silverPrice: '',
};

function num(v: string): number {
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function ZakatCalculator({
  currency,
  onRecord,
}: {
  currency: string;
  onRecord: (amount: number) => void;
}) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [basis, setBasis] = useState<'silver' | 'gold'>('silver');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setValues({ ...EMPTY, ...(JSON.parse(raw) as Partial<Values>) });
    } catch {
      // ignore
    }
  }, []);

  const set = (key: Field, v: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: v };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const result = useMemo(() => {
    const assets = ASSETS.reduce((sum, a) => sum + num(values[a.key]), 0);
    const net = Math.max(0, assets - num(values.debts));
    const goldNisab = num(values.goldPrice) * GOLD_NISAB_GRAMS;
    const silverNisab = num(values.silverPrice) * SILVER_NISAB_GRAMS;
    const nisab = basis === 'gold' ? goldNisab : silverNisab;
    const hasNisab = nisab > 0;
    const due = hasNisab && net >= nisab ? net * ZAKAT_RATE : 0;
    return { assets, net, nisab, hasNisab, due, goldNisab, silverNisab };
  }, [values, basis]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardContent className="space-y-6 p-5">
          <p className="flex items-start gap-2 rounded-xl bg-brand-sage/10 px-3 py-2.5 text-xs text-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-sage" />
            <span>
              <strong>Private to this device.</strong> Your gold, savings and other amounts here are calculated and saved
              only in this browser — they are never sent to Firdam’s servers. Only a zakat payment you choose to record
              is saved to your account.
            </span>
          </p>
          <section>
            <h3 className="text-sm font-semibold text-foreground">1. Today&apos;s metal prices</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter the current price per gram in {currency} from your bank, a jeweller, or a
              trusted price site. The nisab is {GOLD_NISAB_GRAMS} g of gold or {SILVER_NISAB_GRAMS} g of silver.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gold-price">Gold, per gram</Label>
                <Input
                  id="gold-price"
                  inputMode="decimal"
                  value={values.goldPrice}
                  onChange={(e) => set('goldPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="silver-price">Silver, per gram</Label>
                <Input
                  id="silver-price"
                  inputMode="decimal"
                  value={values.silverPrice}
                  onChange={(e) => set('silverPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-3 inline-flex rounded-xl bg-muted p-1 text-xs">
              {(['silver', 'gold'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBasis(b)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 font-medium capitalize transition-colors',
                    basis === b ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {b} nisab
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Many scholars recommend the silver nisab as it benefits more people in need. Follow
              the opinion you trust.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">2. What you own</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Wealth held for a full lunar year (hawl). Your home, car and personal items are not
              included.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ASSETS.map((a) => (
                <div key={a.key} className="space-y-1.5">
                  <Label htmlFor={`z-${a.key}`}>{a.label}</Label>
                  <Input
                    id={`z-${a.key}`}
                    inputMode="decimal"
                    value={values[a.key]}
                    onChange={(e) => set(a.key, e.target.value)}
                    placeholder="0"
                  />
                  {a.hint && <p className="text-[11px] text-muted-foreground">{a.hint}</p>}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">3. What you owe now</h3>
            <div className="mt-3 max-w-xs space-y-1.5">
              <Label htmlFor="z-debts">Debts and bills due now</Label>
              <Input
                id="z-debts"
                inputMode="decimal"
                value={values.debts}
                onChange={(e) => set('debts', e.target.value)}
                placeholder="0"
              />
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <div className="bg-girih bg-gradient-to-br from-brand-espresso to-brand-mid p-5 text-brand-linen">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-brand-linen/75">
              <Scale className="h-4 w-4" />
              Zakat due
            </p>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">
              {formatMoney(result.due, currency)}
            </p>
            <p className="mt-1 text-sm text-brand-linen/80">
              {!result.hasNisab
                ? `Enter the ${basis} price to check the nisab.`
                : result.due > 0
                  ? '2.5% of your net zakatable wealth'
                  : 'Your wealth is below the nisab — no zakat is due.'}
            </p>
          </div>
          <CardContent className="space-y-2 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total assets</span>
              <span className="tabular-nums text-foreground">{formatMoney(result.assets, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Debts due</span>
              <span className="tabular-nums text-foreground">− {formatMoney(num(values.debts), currency)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span className="text-foreground">Net zakatable wealth</span>
              <span className="tabular-nums text-foreground">{formatMoney(result.net, currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Nisab ({basis})</span>
              <span className="tabular-nums text-muted-foreground">
                {result.hasNisab ? formatMoney(result.nisab, currency) : '—'}
              </span>
            </div>
            {result.due > 0 && (
              <Button className="mt-3 w-full" onClick={() => onRecord(Math.round(result.due * 100) / 100)}>
                Record as zakat paid
              </Button>
            )}
          </CardContent>
        </Card>
        <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This is a guide to help you estimate. For gold jewellery, pensions, rental property and
          other special cases, please consult a scholar you trust.
        </p>
      </div>
    </div>
  );
}
