'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Crown, Loader2, Receipt, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UpgradeDialog } from '@/components/plan/upgrade-prompt';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase/functions';
import { usePlan } from '@/lib/plan/plan';
import { applyPantryChanges, changesForAdding } from '@/lib/pantry/store';
import { matchScore } from '@/lib/pantry/units';
import { undoToast } from '@/features/pantry/cook-dialog';
import { PANTRY_UNITS, type PantryCategory, type PantryItem, type PantryUnit } from '@/types/database';
import { cn } from '@/lib/utils';

interface ScannedItem {
  name: string;
  quantity: number;
  unit: PantryUnit;
  category: PantryCategory;
  staple: boolean;
  keep: boolean;
}

interface ScanResult {
  items: Omit<ScannedItem, 'keep'>[];
  store: string | null;
  date: string | null;
  total: number | null;
  currency: string | null;
  used: number;
  limit: number;
}

/** Shrinks a phone photo to ~1600px JPEG so it uploads fast and stays readable. */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Scan a receipt (Premium / Family+): photo → list of food → check it → pantry.
 * Optionally ticks the items off the shopping list and records the spend.
 */
export function ReceiptScanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { isPaid, loading: planLoading } = usePlan();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'pick' | 'reading' | 'review'>('pick');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [tickList, setTickList] = useState(true);
  const [addSpend, setAddSpend] = useState(true);
  const [onListCount, setOnListCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setPreview(null);
    setResult(null);
    setItems([]);
  }, [open]);

  const scan = async (file: File | undefined) => {
    if (!file) return;
    setStep('reading');
    try {
      const image = await toDataUrl(file);
      setPreview(image);
      const res = await callEdgeFunction<ScanResult>('receipt-scan', undefined, { body: { image } });
      if (!res.items.length) {
        toast.error('We couldn’t find any food on that photo. Try a flatter, brighter photo of the whole receipt.');
        setStep('pick');
        return;
      }
      setResult(res);
      setItems(res.items.map((i) => ({ ...i, keep: true })));
      const { data: list } = await supabase.from('grocery_items').select('name').eq('checked', false);
      setOnListCount((list ?? []).filter((g) => res.items.some((i) => matchScore(g.name, i.name) >= 2 || matchScore(i.name, g.name) >= 2)).length);
      setStep('review');
    } catch (err) {
      if (err instanceof EdgeFunctionError && err.status === 402) setUpgradeOpen(true);
      toast.error(err instanceof Error ? err.message : 'Could not read the receipt');
      setStep('pick');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const update = (idx: number, patch: Partial<ScannedItem>) => setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const save = async () => {
    const kept = items.filter((i) => i.keep && i.name.trim());
    if (!kept.length) return;
    setSaving(true);
    try {
      const { data: pantry } = await supabase.from('pantry_items').select('*');
      const changes = changesForAdding(
        kept.map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity,
          unit: i.unit,
          category: i.category,
          ...(i.staple ? { tracking: 'level' as const, level: 'full' as const } : {}),
        })),
        (pantry ?? []) as PantryItem[]
      );
      const label = `Receipt${result?.store ? ` — ${result.store}` : ''}`;
      const batch = await applyPantryChanges(changes, 'receipt', label);

      if (tickList && onListCount > 0) {
        const { data: list } = await supabase.from('grocery_items').select('id, name').eq('checked', false);
        const ids = (list ?? [])
          .filter((g) => kept.some((i) => matchScore(g.name, i.name) >= 2 || matchScore(i.name, g.name) >= 2))
          .map((g) => g.id);
        if (ids.length) await supabase.from('grocery_items').delete().in('id', ids);
      }
      if (addSpend && result?.total) {
        const { data: cats } = await supabase.from('budget_categories').select('id, name');
        const cat = (cats ?? []).find((c) => /grocer|food|shopping/i.test(c.name));
        await supabase.from('budget_transactions').insert({
          type: 'expense',
          amount: result.total,
          category_id: cat?.id ?? null,
          description: `Groceries${result.store ? ` — ${result.store}` : ''}`,
          occurred_on: result.date ?? todayISO(),
        });
      }
      window.dispatchEvent(new Event('pantry-items-changed'));
      window.dispatchEvent(new Event('grocery-items-changed'));
      onOpenChange(false);
      undoToast(`${kept.length} item${kept.length === 1 ? '' : 's'} added from your receipt`, batch);
    } catch (err) {
      toast.error('Could not save', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const keptCount = items.filter((i) => i.keep).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !saving && step !== 'reading' && onOpenChange(o)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Scan a receipt
            </DialogTitle>
            <DialogDescription>
              Take a photo of your shopping receipt. We’ll list the food on it — you check it, and it goes into your pantry.
            </DialogDescription>
          </DialogHeader>

          {step === 'pick' && (
            <div className="space-y-4">
              {!planLoading && !isPaid ? (
                <div className="rounded-2xl border border-brand-gold/40 bg-brand-gold/10 p-5 text-center">
                  <Crown className="mx-auto h-6 w-6 text-[#7a5a30] dark:text-brand-gold" />
                  <p className="mt-2 font-semibold text-foreground">Receipt scanning comes with Premium and Family+</p>
                  <p className="mt-1 text-sm text-muted-foreground">Free plan: use quick add — type “2 kg chicken, a dozen eggs”.</p>
                  <Button className="mt-4" onClick={() => setUpgradeOpen(true)}>
                    See plans
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => scan(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-10 text-center transition-colors hover:border-primary"
                  >
                    <Camera className="h-8 w-8 text-primary" />
                    <span className="font-semibold text-foreground">Take a photo or choose one</span>
                    <span className="text-xs text-muted-foreground">
                      Lay the receipt flat in good light, with the whole list in the picture.
                    </span>
                  </button>
                  <p className="text-center text-xs text-muted-foreground">Up to 30 receipts a month. The photo isn’t stored.</p>
                </>
              )}
            </div>
          )}

          {step === 'reading' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Your receipt" className="max-h-48 rounded-xl border border-border object-contain opacity-70" />
              )}
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading your receipt… (about 10 seconds)
              </p>
            </div>
          )}

          {step === 'review' && result && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {result.store ? <span className="font-medium text-foreground">{result.store}</span> : 'Receipt'}
                {result.date && ` · ${result.date}`}
                {result.total != null && ` · total ${result.total.toFixed(2)}${result.currency ? ` ${result.currency}` : ''}`}
                {' · '}untick anything that’s wrong or not for the pantry.
              </p>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {items.map((it, idx) => (
                  <li key={idx} className={cn('flex flex-wrap items-center gap-2 px-3 py-2', !it.keep && 'opacity-50')}>
                    <Checkbox checked={it.keep} onCheckedChange={(v) => update(idx, { keep: !!v })} aria-label={`Keep ${it.name}`} />
                    <Input value={it.name} onChange={(e) => update(idx, { name: e.target.value })} className="h-8 min-w-[9rem] flex-1 text-sm" aria-label="Item name" />
                    {it.staple ? (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">staple · full</span>
                    ) : (
                      <>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={it.quantity}
                          onChange={(e) => update(idx, { quantity: Number(e.target.value) || 0 })}
                          className="h-8 w-20 text-sm"
                          aria-label="Quantity"
                        />
                        <select
                          value={it.unit}
                          onChange={(e) => update(idx, { unit: e.target.value as PantryUnit })}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          aria-label="Unit"
                        >
                          {PANTRY_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => update(idx, { staple: !it.staple })}
                      className="text-xs text-primary hover:underline"
                    >
                      {it.staple ? 'track amount' : 'staple?'}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="space-y-2 text-sm">
                {onListCount > 0 && (
                  <label className="flex items-center gap-2">
                    <Checkbox checked={tickList} onCheckedChange={(v) => setTickList(!!v)} />
                    Tick {onListCount} of these off my shopping list
                  </label>
                )}
                {result.total != null && (
                  <label className="flex items-center gap-2">
                    <Checkbox checked={addSpend} onCheckedChange={(v) => setAddSpend(!!v)} />
                    Record {result.total.toFixed(2)} in my budget as grocery spending
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {result.used} of {result.limit} scans used this month.
              </p>
            </div>
          )}

          <DialogFooter>
            {step === 'review' ? (
              <>
                <Button variant="ghost" onClick={() => setStep('pick')} disabled={saving}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Scan another
                </Button>
                <Button onClick={save} disabled={saving || keptCount === 0}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Add {keptCount} to pantry
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={step === 'reading'}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Scan receipts with Premium"
        description="Photograph your receipt and your pantry fills itself — up to 30 receipts a month."
      />
    </>
  );
}
