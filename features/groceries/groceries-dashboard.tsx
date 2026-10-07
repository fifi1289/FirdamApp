'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  Check,
  ListPlus,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { applyPantryChanges, changesForAdding } from '@/lib/pantry/store';
import { isStapleFood } from '@/lib/pantry/quick-add';
import { undoToast } from '@/features/pantry/cook-dialog';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { CATEGORY_ICONS } from '@/features/pantry/pantry-config';
import type { GroceryItem, GroceryList, PantryItem } from '@/types/database';
import {
  formatQty,
  groupByAisle,
  guessCategory,
  listToText,
  needsHalalSource,
  parseQuickAdd,
  asPantryCategory,
} from '@/features/groceries/grocery-utils';
import { FromMealPlanDialog } from '@/features/groceries/from-meal-plan-dialog';
import { usePlan } from '@/lib/plan/plan';
import { UpgradeDialog } from '@/components/plan/upgrade-prompt';

const ACTIVE_LIST_KEY = 'firdam.groceries.activeList';

// Guards against creating the default list twice (React Strict Mode).
let creatingDefaultList: Promise<GroceryList | null> | null = null;

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: GroceryItem;
  onToggle: (item: GroceryItem) => void;
  onDelete: (item: GroceryItem) => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          item.checked
            ? 'border-brand-sage bg-brand-sage text-white'
            : 'border-border hover:border-primary'
        )}
      >
        {item.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium transition-colors',
            item.checked ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {item.name}
        </p>
        {(item.note || item.from_meal_plan) && (
          <p className="truncate text-xs text-muted-foreground">
            {item.note ?? 'From your meal plan'}
          </p>
        )}
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatQty(item.quantity, item.unit)}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label={`Remove ${item.name}`}
        className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive focus:opacity-100 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

export function GroceriesDashboard() {
  const supabase = createSupabaseBrowserClient();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [quickAdd, setQuickAdd] = useState('');
  const [adding, setAdding] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [mealPlanOpen, setMealPlanOpen] = useState(false);
  const [movingToPantry, setMovingToPantry] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { atLimit } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const activeList = lists.find((l) => l.id === activeId) ?? null;

  const loadLists = useCallback(async () => {
    const { data, error } = await supabase
      .from('grocery_lists')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to load lists:', error.message);
      setLoading(false);
      return;
    }
    let rows = data ?? [];
    if (rows.length === 0) {
      creatingDefaultList ??= Promise.resolve(
        supabase.from('grocery_lists').insert({ name: 'Weekly groceries' }).select().single()
      ).then(({ data: created, error: createError }) => {
        if (createError) console.error('Failed to create default list:', createError.message);
        return created ?? null;
      });
      const created = await creatingDefaultList;
      rows = created ? [created] : [];
    }
    setLists(rows);
    const remembered = (() => {
      try {
        return window.localStorage.getItem(ACTIVE_LIST_KEY);
      } catch {
        return null;
      }
    })();
    setActiveId((prev) =>
      prev && rows.some((r) => r.id === prev)
        ? prev
        : remembered && rows.some((r) => r.id === remembered)
          ? remembered
          : rows[0]?.id ?? null
    );
    setLoading(false);
  }, [supabase]);

  const loadItems = useCallback(
    async (listId: string) => {
      setItemsLoading(true);
      const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: true });
      if (error) console.error('Failed to load items:', error.message);
      setItems(data ?? []);
      setItemsLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!activeId) {
      setItems([]);
      return;
    }
    try {
      window.localStorage.setItem(ACTIVE_LIST_KEY, activeId);
    } catch {
      // ignore
    }
    loadItems(activeId);
  }, [activeId, loadItems]);

  const remaining = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const groups = useMemo(() => groupByAisle(remaining), [remaining]);
  const progress = items.length ? Math.round((checked.length / items.length) * 100) : 0;
  const halalReminder = remaining.some((i) => needsHalalSource(asPantryCategory(i.category)));

  const addItem = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeId || !quickAdd.trim()) return;
    const parsed = parseQuickAdd(quickAdd);
    setAdding(true);
    const { data, error } = await supabase
      .from('grocery_items')
      .insert({
        list_id: activeId,
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        category: guessCategory(parsed.name),
      })
      .select()
      .single();
    setAdding(false);
    if (error) {
      toast.error('Could not add item', { description: error.message });
      return;
    }
    setItems((prev) => [...prev, data]);
    setQuickAdd('');
    inputRef.current?.focus();
  };

  const toggleItem = async (item: GroceryItem) => {
    const next = !item.checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)));
    const { error } = await supabase
      .from('grocery_items')
      .update({ checked: next, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i)));
      toast.error('Could not update item');
    }
  };

  const deleteItem = async (item: GroceryItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const { error } = await supabase.from('grocery_items').delete().eq('id', item.id);
    if (error) {
      toast.error('Could not remove item');
      if (activeId) loadItems(activeId);
    }
  };

  const clearChecked = async () => {
    if (!checked.length) return;
    const ids = checked.map((i) => i.id);
    setItems((prev) => prev.filter((i) => !i.checked));
    const { error } = await supabase.from('grocery_items').delete().in('id', ids);
    if (error) {
      toast.error('Could not clear items');
      if (activeId) loadItems(activeId);
    }
  };

  /** "Put it all away": bought items go into the pantry, merging with what's already there. */
  const moveCheckedToPantry = async () => {
    if (!checked.length) return;
    setMovingToPantry(true);
    try {
      const { data: pantry } = await supabase.from('pantry_items').select('*');
      const changes = changesForAdding(
        checked.map((i) => ({
          name: i.name,
          quantity: i.quantity ?? 1,
          unit: i.unit,
          category: asPantryCategory(i.category),
          ...(isStapleFood(i.name) ? { tracking: 'level' as const, level: 'full' as const } : {}),
        })),
        (pantry ?? []) as PantryItem[]
      );
      const batch = await applyPantryChanges(changes, 'shopping', 'Shopping put away');
      await supabase.from('grocery_items').delete().in('id', checked.map((i) => i.id));
      setItems((prev) => prev.filter((i) => !i.checked));
      window.dispatchEvent(new Event('pantry-items-changed'));
      undoToast(`${checked.length} item${checked.length === 1 ? '' : 's'} put away in your pantry`, batch);
    } catch (err) {
      toast.error('Could not add to pantry', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setMovingToPantry(false);
    }
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    const { data, error } = await supabase.from('grocery_lists').insert({ name }).select().single();
    if (error) {
      toast.error('Could not create list', { description: error.message });
      return;
    }
    setLists((prev) => [...prev, data]);
    setActiveId(data.id);
    setNewListName('');
    setCreatingList(false);
  };

  const renameList = async (id: string) => {
    const name = renameValue.trim();
    setRenaming(null);
    if (!name) return;
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
    const { error } = await supabase
      .from('grocery_lists')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error('Could not rename list');
  };

  const deleteList = async (list: GroceryList) => {
    if (!window.confirm(`Delete "${list.name}" and all its items?`)) return;
    const { error } = await supabase.from('grocery_lists').delete().eq('id', list.id);
    if (error) {
      toast.error('Could not delete list', { description: error.message });
      return;
    }
    const rest = lists.filter((l) => l.id !== list.id);
    setLists(rest);
    if (activeId === list.id) setActiveId(rest[0]?.id ?? null);
    if (rest.length === 0) loadLists();
  };

  const shareList = async () => {
    if (!activeList) return;
    const text = listToText(activeList.name, items);
    try {
      if (navigator.share) {
        await navigator.share({ title: activeList.name, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success('List copied — paste it into WhatsApp or a message');
    } catch {
      // user cancelled the share sheet
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Shopping"
        description="Smart shopping lists that fill themselves from your meal plan — minus what's already in your pantry."
      >
        <Button variant="outline" size="sm" onClick={shareList} disabled={!activeList || remaining.length === 0}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button size="sm" onClick={() => setMealPlanOpen(true)} disabled={!activeId}>
          <Sparkles className="mr-2 h-4 w-4" />
          Add from meal plan
        </Button>
      </PageHeader>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your lists…
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
          {/* Lists */}
          <aside className="space-y-2">
            <p className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              Your lists
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className={cn(
                    'group flex shrink-0 items-center gap-1 rounded-xl border pr-1 transition-colors',
                    list.id === activeId
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-transparent hover:bg-muted'
                  )}
                >
                  {renaming === list.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        renameList(list.id);
                      }}
                      className="flex-1 p-1"
                    >
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => renameList(list.id)}
                        className="h-8"
                        maxLength={80}
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveId(list.id)}
                      className="flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground"
                    >
                      <ShoppingCart
                        className={cn(
                          'h-4 w-4',
                          list.id === activeId ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <span className="truncate">{list.name}</span>
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="List actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setRenaming(list.id);
                          setRenameValue(list.name);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => deleteList(list)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete list
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
            {creatingList ? (
              <form onSubmit={createList} className="flex gap-1.5">
                <Input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Eid shopping"
                  className="h-9"
                  maxLength={80}
                />
                <Button type="submit" size="sm" className="h-9">
                  Add
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  if (atLimit('shoppingLists', lists.length)) {
                    setUpgradeOpen(true);
                    return;
                  }
                  setCreatingList(true);
                }}
              >
                <ListPlus className="mr-2 h-4 w-4" />
                New list
              </Button>
            )}
          </aside>

          {/* Active list */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <form onSubmit={addItem} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={quickAdd}
                    onChange={(e) => setQuickAdd(e.target.value)}
                    placeholder='Add an item — try "2 kg chicken" or "dates"'
                    aria-label="Add grocery item"
                    disabled={!activeId}
                  />
                  <Button type="submit" disabled={adding || !quickAdd.trim() || !activeId}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Add</span>
                  </Button>
                </form>
                {items.length > 0 && (
                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {checked.length}/{items.length} in the basket
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {halalReminder && (
              <Link
                href="/dashboard/halal-places?category=butcher"
                className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm transition-colors hover:border-primary/40"
              >
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 text-foreground">
                  Your list has meat or poultry. Find a halal butcher near you.
                </span>
                <span className="text-xs font-medium text-primary">Find one →</span>
              </Link>
            )}

            {itemsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading items…
                </CardContent>
              </Card>
            ) : items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ShoppingCart className="h-7 w-7" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">
                    {activeList ? `${activeList.name} is empty` : 'No list selected'}
                  </h3>
                  <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                    Add items above, or fill the list from this week&apos;s meal plan in one tap.
                  </p>
                  <Button size="sm" className="mt-6" onClick={() => setMealPlanOpen(true)} disabled={!activeId}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Add from meal plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {groups.map((group) => {
                  const Icon = CATEGORY_ICONS[group.category];
                  return (
                    <Card key={group.category} className="overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.category}
                        </p>
                        <span className="ml-auto text-xs text-muted-foreground">{group.items.length}</span>
                      </div>
                      <ul className="divide-y divide-border/60">
                        {group.items.map((item) => (
                          <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
                        ))}
                      </ul>
                    </Card>
                  );
                })}

                {remaining.length === 0 && (
                  <p className="rounded-2xl bg-brand-sage/10 px-4 py-3 text-center text-sm font-medium text-brand-sage">
                    Everything is in the basket. Alhamdulillah!
                  </p>
                )}

                {checked.length > 0 && (
                  <Card className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        In the basket ({checked.length})
                      </p>
                      <div className="ml-auto flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={moveCheckedToPantry}
                          disabled={movingToPantry}
                        >
                          {movingToPantry ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Archive className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Put away in pantry
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearChecked}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Clear
                        </Button>
                      </div>
                    </div>
                    <ul className="divide-y divide-border/60">
                      {checked.map((item) => (
                        <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} limitKey="shoppingLists" />
      <FromMealPlanDialog
        open={mealPlanOpen}
        onOpenChange={setMealPlanOpen}
        listId={activeId}
        existingItems={items}
        onAdded={() => activeId && loadItems(activeId)}
      />
    </AppShell>
  );
}
