'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, Users } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FamilyEvent } from '@/types/database';
import { EVENT_KINDS, formatTime, iso, parseISODate } from '@/features/calendar/calendar-config';
import { useCalendarData, type CalendarItem } from '@/features/calendar/use-calendar';
import { EventDialog } from '@/features/calendar/event-dialog';

const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  // 2024-01-01 was a Monday
  new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' })
);

function startOfGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  return new Date(year, month, 1 - offset);
}

function relativeDays(date: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((parseISODate(date).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `In ${diff} days`;
  if (diff < 14) return 'Next week';
  return `In ${Math.round(diff / 7)} weeks`;
}

function ItemLine({ item, onEdit }: { item: CalendarItem; onEdit: (e: FamilyEvent) => void }) {
  const meta = EVENT_KINDS[item.kind];
  const Icon = meta.icon;
  const time = formatTime(item.startTime ?? null);
  const end = formatTime(item.endTime ?? null);
  const content = (
    <>
      <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.pill)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{meta.label}</span>
          {time && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {time}
              {end ? `–${end}` : ''}
            </span>
          )}
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          )}
          {item.memberNames && item.memberNames.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {item.memberNames.join(', ')}
            </span>
          )}
        </span>
      </span>
    </>
  );
  if (item.event) {
    return (
      <button
        type="button"
        onClick={() => onEdit(item.event!)}
        className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted"
      >
        {content}
      </button>
    );
  }
  return <div className="flex items-start gap-3 p-2">{content}</div>;
}

export function CalendarDashboard() {
  const today = new Date();
  const todayKey = iso(today);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(todayKey);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyEvent | null>(null);

  const gridStart = useMemo(() => startOfGrid(view.year, view.month), [view]);
  const gridEnd = useMemo(() => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + 41);
    return d;
  }, [gridStart]);

  // Load enough to cover the grid and the next two months of "coming up".
  const rangeEnd = useMemo(() => {
    const ahead = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
    return ahead > gridEnd ? ahead : gridEnd;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridEnd]);
  const rangeStart = useMemo(() => {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return t < gridStart ? t : gridStart;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridStart]);

  const { items, hijri, members, loading } = useCalendarData(rangeStart, rangeEnd);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const list = map.get(it.date) ?? [];
      list.push(it);
      map.set(it.date, list);
    }
    return map;
  }, [items]);

  const upcoming = useMemo(() => items.filter((i) => i.date >= todayKey).slice(0, 12), [items, todayKey]);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const monthTitle = new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const hijriTitle = (() => {
    const a = hijri.get(iso(new Date(view.year, view.month, 1)));
    const b = hijri.get(iso(new Date(view.year, view.month + 1, 0)));
    if (!a || !b) return null;
    return a.month === b.month ? `${a.month} ${a.year} AH` : `${a.month} – ${b.month} ${b.year} AH`;
  })();

  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (e: FamilyEvent) => {
    setEditing(e);
    setDialogOpen(true);
  };

  const selectedItems = byDate.get(selected) ?? [];
  const selectedHijri = hijri.get(selected);

  return (
    <AppShell>
      <PageHeader
        title="Family Calendar"
        description="Eid, Aqiqah, Nikah, birthdays and school events — everything your family has coming up."
      >
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          New event
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <p className="font-display text-lg font-semibold text-foreground">{monthTitle}</p>
              {hijriTitle && <p className="text-xs text-muted-foreground">{hijriTitle}</p>}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setView({ year: today.getFullYear(), month: today.getMonth() });
                  setSelected(todayKey);
                }}
              >
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const key = iso(d);
              const inMonth = d.getMonth() === view.month;
              const dayItems = byDate.get(key) ?? [];
              const h = hijri.get(key);
              const isToday = key === todayKey;
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  onDoubleClick={() => {
                    setSelected(key);
                    openNew();
                  }}
                  className={cn(
                    'relative min-h-[64px] border-b border-r border-border/60 p-1.5 text-left transition-colors sm:min-h-[96px]',
                    !inMonth && 'bg-muted/30',
                    isSelected ? 'bg-primary/5 ring-2 ring-inset ring-primary/40' : 'hover:bg-muted/50'
                  )}
                  aria-label={d.toDateString()}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums',
                        isToday ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/60'
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {h && (
                      <span className={cn('text-[10px] tabular-nums', inMonth ? 'text-muted-foreground' : 'text-muted-foreground/50')}>
                        {h.day}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {dayItems.slice(0, 2).map((it) => (
                      <p
                        key={it.id}
                        className={cn('truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium', EVENT_KINDS[it.kind].pill)}
                      >
                        {it.title}
                      </p>
                    ))}
                    {dayItems.length > 2 && (
                      <p className="px-1.5 text-[10px] text-muted-foreground">+{dayItems.length - 2} more</p>
                    )}
                  </div>
                  {dayItems.length > 0 && (
                    <div className="mt-1 flex gap-0.5 sm:hidden">
                      {dayItems.slice(0, 3).map((it) => (
                        <span key={it.id} className={cn('h-1.5 w-1.5 rounded-full', EVENT_KINDS[it.kind].dot)} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 px-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {parseISODate(selected).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  {selectedHijri && (
                    <p className="text-xs text-muted-foreground">
                      {selectedHijri.day} {selectedHijri.month} {selectedHijri.year} AH
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openNew} aria-label="Add event on this day">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2">
                {selectedItems.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground">Nothing planned.</p>
                ) : (
                  selectedItems.map((it) => <ItemLine key={it.id} item={it} onEdit={openEdit} />)
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="px-2 text-sm font-semibold text-foreground">Coming up</p>
              {loading ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">Loading…</p>
              ) : upcoming.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  No upcoming events.{' '}
                  {members.length === 0 && (
                    <>
                      Add your{' '}
                      <Link href="/dashboard/family" className="text-primary hover:underline">
                        family members
                      </Link>{' '}
                      to see their birthdays here.
                    </>
                  )}
                </div>
              ) : (
                <ul className="mt-1">
                  {upcoming.map((it, i) => {
                    const showHeader = i === 0 || upcoming[i - 1]!.date !== it.date;
                    return (
                      <li key={it.id}>
                        {showHeader && (
                          <p className="px-2 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {relativeDays(it.date)} ·{' '}
                            {parseISODate(it.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                        <ItemLine item={it} onEdit={openEdit} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={selected}
        members={members}
      />
    </AppShell>
  );
}
