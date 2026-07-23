'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Archive,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PANTRY_CATEGORIES,
  type PantryCategory,
  type PantryItem,
} from '@/types/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CATEGORY_ICONS } from '@/features/pantry/pantry-config';
import {
  PantryItemFormDialog,
  itemToValues,
  emptyItemValues,
  type PantryItemFormValues,
} from '@/features/pantry/pantry-item-form-dialog';

export { PANTRY_ITEMS_CHANGED } from '@/features/pantry/pantry-item-form-dialog';

type PantryStatus = 'fresh' | 'soon' | 'expired';

const STATUS_BADGE: Record<PantryStatus, { label: string; className: string }> = {
  fresh: {
    label: 'Fresh',
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  soon: {
    label: 'Expiring Soon',
    className:
      'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  expired: {
    label: 'Expired',
    className:
      'border-destructive/30 bg-destructive/10 text-destructive',
  },
};

function computeStatus(iso: string | null): {
  label: string;
  status: PantryStatus;
} | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const label = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const status: PantryStatus =
    diffDays < 0 ? 'expired' : diffDays <= 7 ? 'soon' : 'fresh';
  return { label, status };
}

function PantryItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  onDelete: (item: PantryItem) => void;
}) {
  const Icon = CATEGORY_ICONS[item.category] ?? Archive;
  const exp = computeStatus(item.expiration_date);

  return (
    <div className="group rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{item.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Item actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(item)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDelete(item)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-medium">
              {item.category}
            </Badge>
            {exp && (
              <Badge
                variant="outline"
                className={cn('text-[10px] font-medium', STATUS_BADGE[exp.status].className)}
              >
                {STATUS_BADGE[exp.status].label}
              </Badge>
            )}
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {item.quantity} {item.unit}
            </span>
          </div>
          {exp && (
            <p
              className={cn(
                'mt-2 flex items-center gap-1 text-xs',
                exp.status === 'expired'
                  ? 'text-destructive'
                  : exp.status === 'soon'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {exp.status === 'expired'
                ? `Expired ${exp.label}`
                : `Expires ${exp.label}`}
            </p>
          )}
          {item.notes && (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {item.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type SortOption = 'expiration' | 'recent' | 'name' | 'category';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'expiration', label: 'Expiration Date (Soonest First)' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'category', label: 'Category' },
];

function sortItems(list: PantryItem[], sort: SortOption): PantryItem[] {
  const sorted = [...list];
  switch (sort) {
    case 'expiration':
      sorted.sort((a, b) => {
        if (!a.expiration_date && !b.expiration_date) return 0;
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return a.expiration_date.localeCompare(b.expiration_date);
      });
      break;
    case 'recent':
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    case 'name':
      sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      break;
    case 'category':
      sorted.sort((a, b) => {
        const c = a.category.localeCompare(b.category, undefined, {
          sensitivity: 'base',
        });
        if (c !== 0) return c;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
      break;
  }
  return sorted;
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}

export function PantryItemsList() {
  const supabase = createSupabaseBrowserClient();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PantryCategory | 'All'>('All');
  const [sort, setSort] = useState<SortOption>('recent');
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [editValues, setEditValues] = useState<PantryItemFormValues>(emptyItemValues());
  const [editOpen, setEditOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PantryItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load pantry items:', error.message);
    }
    setItems(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadItems();
    const handler = () => loadItems();
    window.addEventListener('pantry-items-changed', handler);
    return () => window.removeEventListener('pantry-items-changed', handler);
  }, [loadItems]);

  const startEdit = (item: PantryItem) => {
    setEditingItem(item);
    setEditValues(itemToValues(item));
    setEditOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    const id = deletingItem.id;
    setDeleting(true);
    const { error } = await supabase.from('pantry_items').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      console.error('Failed to delete item:', error.message);
      toast.error('Could not delete item', { description: error.message });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteOpen(false);
    setDeletingItem(null);
    toast.success('Item removed from pantry');
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-sm text-muted-foreground">Loading your pantry…</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Archive className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            Your pantry is empty
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Add your first item to start managing your household food inventory and reduce waste.
          </p>
          <Button size="sm" className="mt-6" onClick={() => window.dispatchEvent(new Event('pantry-open-add'))}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first item
          </Button>
        </CardContent>
      </Card>
    );
  }

  const trimmedSearch = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesSearch =
      !trimmedSearch || item.name.toLowerCase().includes(trimmedSearch);
    const matchesCategory =
      activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  const sorted = sortItems(filtered, sort);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name…"
              className="pl-9"
              aria-label="Search pantry items"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Sort by</span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="h-9 w-[230px]" aria-label="Sort pantry items">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <CategoryChip
            label="All"
            active={activeCategory === 'All'}
            onClick={() => setActiveCategory('All')}
          />
          {PANTRY_CATEGORIES.map((c) => (
            <CategoryChip
              key={c}
              label={c}
              active={activeCategory === c}
              onClick={() => setActiveCategory(c)}
            />
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Search className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No matching items
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try a different search term or category filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setSearch('');
                  setActiveCategory('All');
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((item) => (
              <PantryItemCard
                key={item.id}
                item={item}
                onEdit={startEdit}
                onDelete={(i) => {
                  setDeletingItem(i);
                  setDeleteOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <PantryItemFormDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        values={editValues}
        onValuesChange={setEditValues}
        item={editingItem ?? undefined}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem
                ? `"${deletingItem.name}" will be permanently removed from your pantry.`
                : 'This item will be permanently removed.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
