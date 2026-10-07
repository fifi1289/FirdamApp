'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Lightbulb, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { restockSuggestions, type RestockSuggestion } from '@/lib/pantry/habits';
import { formatAmount } from '@/lib/pantry/units';
import { setStapleLevel } from '@/features/pantry/pantry-tools';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'firdam.restock.dismissed';

function dismissed(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(DISMISS_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * "Suggested for your next shop": staples that are low or out, and things the
 * family buys regularly that are due again — one tap to add.
 */
export function RestockSuggestions({
  onAdd,
  disabled,
}: {
  onAdd: (items: { name: string; quantity: number | null; unit: string | null }[]) => Promise<void>;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<RestockSuggestion[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await restockSuggestions();
      const hidden = dismissed();
      const week = 7 * 24 * 3600 * 1000;
      setItems(all.filter((s) => !hidden[s.name.toLowerCase()] || Date.now() - hidden[s.name.toLowerCase()]! > week));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener('pantry-items-changed', h);
    window.addEventListener('grocery-items-changed', h);
    return () => {
      window.removeEventListener('pantry-items-changed', h);
      window.removeEventListener('grocery-items-changed', h);
    };
  }, [load]);

  const hide = (s: RestockSuggestion) => {
    try {
      const d = dismissed();
      d[s.name.toLowerCase()] = Date.now();
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(d));
    } catch {
      // ignore
    }
    setItems((cur) => (cur ?? []).filter((x) => x !== s));
  };

  const add = async (list: RestockSuggestion[]) => {
    setBusy(list.length === 1 ? list[0]!.name : '*');
    try {
      await onAdd(list.map((s) => ({ name: s.name, quantity: s.kind === 'due' ? s.quantity : null, unit: s.kind === 'due' ? s.unit : null })));
      setItems((cur) => (cur ?? []).filter((x) => !list.includes(x)));
      toast.success(`Added ${list.length} item${list.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Could not add');
    } finally {
      setBusy(null);
    }
  };

  if (!items || items.length === 0) return null;
  const addable = items.filter((s) => s.kind !== 'check');

  return (
    <Card className="border-brand-gold/40">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="h-4 w-4 text-[#7a5a30] dark:text-brand-gold" /> Suggested for your next shop
          </p>
          {addable.length > 1 && (
            <Button size="sm" variant="outline" disabled={disabled || busy !== null} onClick={() => add(addable)}>
              {busy === '*' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
              Add all {addable.length}
            </Button>
          )}
        </div>
        <ul className="space-y-1.5">
          {items.map((s) => (
            <li key={s.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-foreground">{s.name}</span>
                {s.kind === 'due' && s.quantity != null && (
                  <span className="text-muted-foreground"> · {formatAmount(s.quantity, s.unit)}</span>
                )}
                <span
                  className={cn(
                    'ml-2 text-xs',
                    s.kind === 'out' ? 'text-destructive' : s.kind === 'low' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                  )}
                >
                  {s.kind === 'check' ? `Getting low? (${s.reason})` : s.reason}
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                {s.kind === 'check' && s.item ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={async () => {
                        await setStapleLevel(s.item!, 'low');
                        await add([s]);
                      }}
                      disabled={disabled}
                    >
                      Yes, add
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => hide(s)}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Still fine
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 px-2" disabled={disabled || busy !== null} onClick={() => add([s])}>
                      {busy === s.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={() => hide(s)} aria-label={`Not now: ${s.name}`}>
                      Not now
                    </Button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
