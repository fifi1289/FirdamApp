'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCheck, History, Loader2, Sparkles, Undo2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { parseQuickAdd, SETUP_ITEMS, type ParsedItem } from '@/lib/pantry/quick-add';
import { applyPantryChanges, changesForAdding, undoPantryBatch, type PantryChange } from '@/lib/pantry/store';
import { formatAmount } from '@/lib/pantry/units';
import { undoToast } from '@/features/pantry/cook-dialog';
import type { PantryEvent, PantryItem, PantryUnit } from '@/types/database';
import { cn } from '@/lib/utils';

type Level = NonNullable<PantryItem['level']>;
const LEVELS: Level[] = ['full', 'half', 'low', 'out'];

async function loadPantry(): Promise<PantryItem[]> {
  const { data } = await createSupabaseBrowserClient().from('pantry_items').select('*').order('name');
  return (data ?? []) as PantryItem[];
}

function changed() {
  window.dispatchEvent(new Event('pantry-items-changed'));
}

export function LevelChips({ value, onChange, size = 'sm' }: { value: Level; onChange: (l: Level) => void; size?: 'sm' | 'xs' }) {
  return (
    <span className="inline-flex gap-1">
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn(
            'rounded-full capitalize transition-colors',
            size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
            value === l
              ? l === 'out'
                ? 'bg-destructive text-destructive-foreground'
                : l === 'low'
                  ? 'bg-amber-500 text-white'
                  : 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          {l}
        </button>
      ))}
    </span>
  );
}

/** Sets a staple's level from the pantry list, with Undo. */
export async function setStapleLevel(item: PantryItem, level: Level) {
  try {
    const batch = await applyPantryChanges([{ kind: 'update', item, patch: { level } }], 'manual', `${item.name}: ${level}`);
    changed();
    undoToast(`${item.name} marked ${level}`, batch);
  } catch {
    toast.error('Could not update');
  }
}

// ── Quick add ────────────────────────────────────────────────────────

export function QuickAddBar() {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParsedItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreview(text.trim() ? parseQuickAdd(text) : []);
  }, [text]);

  const add = async () => {
    if (!preview.length) return;
    setSaving(true);
    try {
      const pantry = await loadPantry();
      const changes = changesForAdding(preview, pantry);
      const batch = await applyPantryChanges(changes, 'quick_add', 'Quick add');
      setText('');
      changed();
      undoToast(`Added ${preview.length} item${preview.length === 1 ? '' : 's'} to your pantry`, batch);
    } catch (err) {
      toast.error('Could not add', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-5">
      <CardContent className="space-y-3 p-4">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <div className="relative flex-1">
            <Wand2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Quick add: 2 kg chicken, a dozen eggs, 5 potatoes, a bag of rice"
              className="pl-9"
              aria-label="Quick add to pantry"
            />
          </div>
          <Button type="submit" disabled={!preview.length || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Add {preview.length || ''}
          </Button>
        </form>
        {preview.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {preview.map((p, i) => (
              <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                {p.name}{' '}
                <span className="text-muted-foreground">· {p.tracking === 'level' ? 'staple (full)' : formatAmount(p.quantity, p.unit)}</span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── First-time setup ─────────────────────────────────────────────────

export function PantrySetupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [picked, setPicked] = useState<Record<string, { level?: Level; quantity?: number }>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setPicked({});
  }, [open]);

  const groups = useMemo(() => Array.from(new Set(SETUP_ITEMS.map((i) => i.group))), []);
  const count = Object.keys(picked).length;

  const save = async () => {
    setSaving(true);
    try {
      const pantry = await loadPantry();
      const items = SETUP_ITEMS.filter((i) => picked[i.name]).map((i) => {
        const p = picked[i.name]!;
        return i.staple
          ? { name: i.name, quantity: 1, unit: 'Pack' as PantryUnit, tracking: 'level' as const, level: p.level ?? 'full' }
          : { name: i.name, quantity: p.quantity ?? i.quantity ?? 1, unit: i.unit ?? 'Pieces', tracking: 'count' as const };
      });
      const changes = changesForAdding(items, pantry);
      // Levels chosen here should win over "full" for staples already in the pantry.
      for (const c of changes) {
        if (c.kind === 'update' && c.item.tracking === 'level') c.patch.level = picked[SETUP_ITEMS.find((s) => s.name.toLowerCase() === c.item.name.toLowerCase())?.name ?? '']?.level ?? 'full';
      }
      const batch = await applyPantryChanges(changes, 'setup', 'Pantry setup');
      changed();
      onOpenChange(false);
      undoToast(`Pantry set up with ${items.length} items`, batch);
    } catch (err) {
      toast.error('Could not save', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Set up your pantry
          </DialogTitle>
          <DialogDescription>
            Tick what you have. For cupboard staples just say how full; for fresh food adjust the amount if you like. About 2
            minutes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {SETUP_ITEMS.filter((i) => i.group === g).map((i) => {
                  const p = picked[i.name];
                  return (
                    <div
                      key={i.name}
                      className={cn('rounded-xl border px-3 py-2', p ? 'border-primary/50 bg-primary/5' : 'border-border')}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left text-sm"
                        onClick={() =>
                          setPicked((cur) => {
                            const next = { ...cur };
                            if (next[i.name]) delete next[i.name];
                            else next[i.name] = i.staple ? { level: 'full' } : { quantity: i.quantity };
                            return next;
                          })
                        }
                      >
                        <span className={cn('font-medium', p ? 'text-foreground' : 'text-muted-foreground')}>{i.name}</span>
                        {p ? <Check className="h-4 w-4 text-primary" /> : <span className="text-xs text-muted-foreground">tap if you have it</span>}
                      </button>
                      {p && (
                        <div className="mt-1.5 flex items-center gap-2">
                          {i.staple ? (
                            <LevelChips size="xs" value={p.level ?? 'full'} onChange={(l) => setPicked((c) => ({ ...c, [i.name]: { level: l } }))} />
                          ) : (
                            <>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={p.quantity ?? ''}
                                onChange={(e) => setPicked((c) => ({ ...c, [i.name]: { quantity: Number(e.target.value) || 0 } }))}
                                className="h-7 w-20 text-xs"
                                aria-label={`${i.name} amount`}
                              />
                              <span className="text-xs text-muted-foreground">{i.unit === 'Pieces' ? 'pieces' : i.unit}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || count === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Add {count} item{count === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Weekly check ─────────────────────────────────────────────────────

type CheckChoice = 'have' | 'less' | 'gone';

export function PantryCheckDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [items, setItems] = useState<PantryItem[] | null>(null);
  const [choice, setChoice] = useState<Record<string, CheckChoice>>({});
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChoice({});
    setLevels({});
    setItems(null);
    loadPantry().then(setItems);
  }, [open]);

  const counted = (items ?? []).filter((i) => i.tracking !== 'level');
  const staples = (items ?? []).filter((i) => i.tracking === 'level');

  const save = async () => {
    if (!items) return;
    setSaving(true);
    try {
      const changes: PantryChange[] = [];
      for (const i of counted) {
        const c = choice[i.id];
        if (c === 'gone') changes.push({ kind: 'delete', item: i });
        else if (c === 'less') changes.push({ kind: 'update', item: i, patch: { quantity: +(Number(i.quantity) / 2).toFixed(2) } });
      }
      for (const s of staples) {
        const l = levels[s.id];
        if (l && l !== s.level) changes.push({ kind: 'update', item: s, patch: { level: l } });
      }
      const batch = await applyPantryChanges(changes, 'check', 'Weekly pantry check');
      // Record that the check happened even if nothing changed (stops the reminder for a week).
      await createSupabaseBrowserClient()
        .from('pantry_events')
        .insert({ batch_id: batch, source: 'check', label: 'Weekly pantry check', item_name: 'Weekly check' });
      changed();
      onOpenChange(false);
      if (changes.length) undoToast(`Pantry updated (${changes.length} change${changes.length === 1 ? '' : 's'})`, batch);
      else toast.success('All checked — see you next week');
    } catch (err) {
      toast.error('Could not save', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const Choice = ({ item }: { item: PantryItem }) => {
    const value = choice[item.id] ?? 'have';
    const opts: { v: CheckChoice; label: string }[] = [
      { v: 'have', label: 'Still have' },
      { v: 'less', label: 'Less (½)' },
      { v: 'gone', label: 'Finished' },
    ];
    return (
      <span className="inline-flex gap-1">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setChoice((c) => ({ ...c, [item.id]: o.v }))}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs',
              value === o.v ? (o.v === 'gone' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground') : 'bg-muted text-muted-foreground'
            )}
          >
            {o.label}
          </button>
        ))}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Weekly pantry check
          </DialogTitle>
          <DialogDescription>Everything starts as “Still have”. Only tap what changed — snacks eaten, things finished, staples running low.</DialogDescription>
        </DialogHeader>
        {!items ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Your pantry is empty.</p>
        ) : (
          <div className="space-y-4">
            {counted.length > 0 && (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {counted.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="text-foreground">
                      {i.name} <span className="text-xs text-muted-foreground">· {formatAmount(Number(i.quantity), i.unit)}</span>
                    </span>
                    <Choice item={i} />
                  </li>
                ))}
              </ul>
            )}
            {staples.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cupboard staples</p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {staples.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="text-foreground">{s.name}</span>
                      <LevelChips size="xs" value={levels[s.id] ?? s.level ?? 'full'} onChange={(l) => setLevels((c) => ({ ...c, [s.id]: l }))} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Later
          </Button>
          <Button onClick={save} disabled={saving || !items}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Recent changes with Undo ─────────────────────────────────────────

interface Batch {
  id: string;
  label: string;
  at: string;
  items: string[];
}

export function RecentChanges() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await createSupabaseBrowserClient()
      .from('pantry_events')
      .select('*')
      .eq('undone', false)
      .neq('source', 'undo')
      .order('created_at', { ascending: false })
      .limit(60);
    const map = new Map<string, Batch>();
    for (const e of (data ?? []) as PantryEvent[]) {
      if (e.item_name === 'Weekly check' && !e.pantry_item_id) continue;
      const b = map.get(e.batch_id) ?? { id: e.batch_id, label: e.label ?? e.source, at: e.created_at, items: [] };
      if (!b.items.includes(e.item_name)) b.items.push(e.item_name);
      map.set(e.batch_id, b);
    }
    setBatches(Array.from(map.values()).slice(0, 5));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('pantry-items-changed', load);
    return () => window.removeEventListener('pantry-items-changed', load);
  }, [load]);

  if (!batches.length) return null;

  return (
    <Card className="mt-6">
      <CardContent className="p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4 text-muted-foreground" /> Recent changes
        </p>
        <ul className="divide-y divide-border">
          {batches.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-foreground">{b.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {new Date(b.at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · {b.items.slice(0, 4).join(', ')}
                  {b.items.length > 4 ? ` +${b.items.length - 4}` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy === b.id}
                onClick={async () => {
                  setBusy(b.id);
                  try {
                    await undoPantryBatch(b.id);
                    changed();
                    window.dispatchEvent(new Event('cooking-log-changed'));
                    toast.success('Undone');
                  } catch {
                    toast.error('Could not undo');
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === b.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Undo2 className="mr-1.5 h-4 w-4" />}
                Undo
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

