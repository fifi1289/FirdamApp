'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info, Lock, Moon, Scale } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/features/budget/budget-config';
import {
  EMPTY_ZAKAT,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  ZAKAT_AL_FITR_NOTE,
  ZAKAT_ASSETS,
  ZAKAT_DESCRIPTIONS,
  computeZakatAlFitr,
  computeZakatAlMal,
  parseAmount,
  type ZakatField,
  type ZakatValues,
} from '@/features/budget/finance-core';
import { useHousehold } from '@/lib/pantry/portions';
import { tr, trn } from '@/lib/i18n';

const STORAGE_KEY = 'firdam.zakat.inputs';

const FITR_KEY = 'firdam.zakat.fitr';

const num = parseAmount;
const ASSETS = ZAKAT_ASSETS;
type Field = ZakatField;
type Values = ZakatValues;
const EMPTY = EMPTY_ZAKAT;

export function ZakatCalculator({
  currency,
  onRecord,
}: {
  currency: string;
  /** Opens the entry form prefilled with a zakat payment. */
  onRecord: (amount: number, description: string) => void;
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

  const result = useMemo(() => computeZakatAlMal(values, basis), [values, basis]);

  return (
    <div className="space-y-5">
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardContent className="space-y-6 p-5">
          <p className="flex items-start gap-2 rounded-xl bg-brand-sage/10 px-3 py-2.5 text-xs text-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-sage" />
            <span>
              <strong>{tr('Private to this device.')}</strong> {tr('Your gold, savings and other amounts here are calculated and saved only in this browser — they are never sent to Firdam’s servers. Only a zakat payment you choose to record is saved to your account.')}
            </span>
          </p>
          <section>
            <h3 className="text-sm font-semibold text-foreground">{tr('1. Today\'s metal prices')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr('Enter the current price per gram in {0} from your bank, a jeweller, or a trusted price site. The nisab is {1} g of gold or {2} g of silver.', [currency, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS])}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gold-price">{tr('Gold, per gram')}</Label>
                <Input
                  id="gold-price"
                  inputMode="decimal"
                  value={values.goldPrice}
                  onChange={(e) => set('goldPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="silver-price">{tr('Silver, per gram')}</Label>
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
                  {trn(b)} {tr('nisab')}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {tr('Many scholars recommend the silver nisab as it benefits more people in need. Follow the opinion you trust.')}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">{tr('2. What you own')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr('Wealth held for a full lunar year (hawl). Your home, car and personal items are not included.')}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ASSETS.map((a) => (
                <div key={a.key} className="space-y-1.5">
                  <Label htmlFor={`z-${a.key}`}>{tr(a.label)}</Label>
                  <Input
                    id={`z-${a.key}`}
                    inputMode="decimal"
                    value={values[a.key]}
                    onChange={(e) => set(a.key, e.target.value)}
                    placeholder="0"
                  />
                  {a.hint && <p className="text-[11px] text-muted-foreground">{tr(a.hint)}</p>}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">{tr('3. What you owe now')}</h3>
            <div className="mt-3 max-w-xs space-y-1.5">
              <Label htmlFor="z-debts">{tr('Debts and bills due now')}</Label>
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
              {tr('Zakat al-mal due')}
            </p>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">
              {formatMoney(result.due, currency)}
            </p>
            <p className="mt-1 text-sm text-brand-linen/80">
              {!result.hasNisab
                ? tr('Enter the {0} price to check the nisab.', [basis])
                : result.due > 0
                  ? tr('2.5% of your net zakatable wealth')
                  : tr('Your wealth is below the nisab — no zakat is due.')}
            </p>
          </div>
          <CardContent className="space-y-2 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tr('Total assets')}</span>
              <span className="tabular-nums text-foreground">{formatMoney(result.assets, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tr('Debts due')}</span>
              <span className="tabular-nums text-foreground">− {formatMoney(num(values.debts), currency)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span className="text-foreground">{tr('Net zakatable wealth')}</span>
              <span className="tabular-nums text-foreground">{formatMoney(result.net, currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{tr('Nisab (')}{trn(basis)})</span>
              <span className="tabular-nums text-muted-foreground">
                {result.hasNisab ? formatMoney(result.nisab, currency) : '—'}
              </span>
            </div>
            {result.due > 0 && (
              <Button className="mt-3 w-full" onClick={() => onRecord(Math.round(result.due * 100) / 100, ZAKAT_DESCRIPTIONS.mal)}>
                {tr('Record as zakat paid')}
              </Button>
            )}
          </CardContent>
        </Card>
        <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {tr('This is a guide to help you estimate. For gold jewellery, pensions, rental property and other special cases, please consult a scholar you trust.')}
        </p>
      </div>
    </div>
    <ZakatAlFitr currency={currency} onRecord={onRecord} />
    </div>
  );
}

/** Zakat al-fitr: an amount per person, for everyone the family provides for. */
function ZakatAlFitr({ currency, onRecord }: { currency: string; onRecord: (amount: number, description: string) => void }) {
  const { household } = useHousehold();
  const [people, setPeople] = useState('');
  const [perPerson, setPerPerson] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FITR_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { people?: string; perPerson?: string };
        if (saved.people) setPeople(saved.people);
        if (saved.perPerson) setPerPerson(saved.perPerson);
      }
    } catch {
      // ignore
    }
  }, []);
  // Everyone in the family by default (the user can change it).
  useEffect(() => {
    if (!people && household?.people) setPeople(String(household.people));
  }, [household, people]);

  const save = (next: { people: string; perPerson: string }) => {
    try {
      window.localStorage.setItem(FITR_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };
  const fitr = computeZakatAlFitr(Number(people), perPerson);

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_340px]">
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Moon className="h-4 w-4 text-primary" /> {tr('Zakat al-fitr')}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{tr(ZAKAT_AL_FITR_NOTE)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="fitr-people">{tr('People')}</Label>
              <Input
                id="fitr-people"
                inputMode="numeric"
                value={people}
                onChange={(e) => {
                  setPeople(e.target.value);
                  save({ people: e.target.value, perPerson });
                }}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fitr-each">{tr('Per person (')}{trn(currency)})</Label>
              <Input
                id="fitr-each"
                inputMode="decimal"
                value={perPerson}
                onChange={(e) => {
                  setPerPerson(e.target.value);
                  save({ people, perPerson: e.target.value });
                }}
                placeholder={tr('e.g. 15')}
              />
            </div>
          </div>
        </section>
        <div className="rounded-2xl bg-muted/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{tr('Zakat al-fitr due')}</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
            {formatMoney(fitr.total, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fitr.total > 0
              ? tr('{0} × {1} · pay before the Eid prayer', [fitr.people, formatMoney(fitr.perPerson, currency)])
              : tr('Enter the number of people and the amount per person.')}
          </p>
          {fitr.total > 0 && (
            <Button className="mt-3 w-full" variant="outline" onClick={() => onRecord(Math.round(fitr.total * 100) / 100, ZAKAT_DESCRIPTIONS.fitr)}>
              {tr('Record as zakat al-fitr paid')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
