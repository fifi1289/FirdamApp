'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarPlus,
  Clock,
  ExternalLink,
  Flag,
  Landmark,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationPicker } from '@/components/location/location-picker';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { directionsUrl, distanceKm, formatDistance, useSavedLocation } from '@/lib/geo/location';
import { cn } from '@/lib/utils';
import type { CommunityEvent, CommunityEventKind } from '@/types/database';
import { AUDIENCES, EVENT_KIND_META } from '@/features/community/community-config';
import { EventFormDialog } from '@/features/community/event-form-dialog';

type Rsvp = 'going' | 'interested';
type Counts = Record<string, { going: number; interested: number }>;

function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString(undefined, { month: 'short' }),
    day: d.getDate(),
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

function EventCard({
  event,
  distance,
  counts,
  rsvp,
  onOpen,
}: {
  event: CommunityEvent;
  distance?: number;
  counts?: { going: number; interested: number };
  rsvp?: Rsvp;
  onOpen: () => void;
}) {
  const meta = EVENT_KIND_META[event.kind];
  const Icon = meta.icon;
  const p = dateParts(event.starts_at);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full gap-4 rounded-2xl border border-border/70 bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 py-2 text-primary">
        <span className="text-[10px] font-semibold uppercase">{p.month}</span>
        <span className="font-display text-2xl font-bold leading-none">{p.day}</span>
        <span className="text-[10px]">{p.weekday}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Icon className="h-3.5 w-3.5" /> {meta.label}
          {event.audience !== 'everyone' && (
            <span className="text-muted-foreground">· {AUDIENCES.find((a) => a.value === event.audience)?.label}</span>
          )}
        </p>
        <p className="mt-0.5 line-clamp-1 font-semibold text-foreground">{event.title}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {p.time}
          </span>
          {(event.venue || event.address) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {event.venue ?? event.address}
              {distance !== undefined && ` · ${formatDistance(distance)}`}
            </span>
          )}
          {!event.latitude && event.online_url && <span>Online</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {counts && counts.going > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" /> {counts.going} going
            </span>
          )}
          {rsvp && (
            <Badge variant="outline" className="border-brand-sage/30 bg-brand-sage/10 text-brand-sage">
              {rsvp === 'going' ? 'You’re going' : 'Interested'}
            </Badge>
          )}
          {!event.is_free && event.price && <Badge variant="secondary">{event.price}</Badge>}
        </div>
      </div>
    </button>
  );
}

export function CommunityDashboard() {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const { location, save } = useSavedLocation();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [rsvps, setRsvps] = useState<Record<string, Rsvp>>({});
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState('50');
  const [kind, setKind] = useState<CommunityEventKind | 'all'>('all');
  const [scope, setScope] = useState<'upcoming' | 'mine'>('upcoming');
  const [selected, setSelected] = useState<CommunityEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityEvent | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 6 * 3600_000).toISOString();
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .gte('starts_at', since)
      .order('starts_at', { ascending: true })
      .limit(300);
    if (error) console.error('Failed to load events:', error.message);
    const list = data ?? [];
    setEvents(list);
    setLoading(false);
    if (list.length) {
      const ids = list.map((e) => e.id);
      const [{ data: c }, { data: mine }] = await Promise.all([
        supabase.rpc('event_rsvp_counts', { ids }),
        supabase.from('event_rsvps').select('event_id,status').in('event_id', ids),
      ]);
      const map: Counts = {};
      for (const row of c ?? []) map[row.event_id] = { going: Number(row.going), interested: Number(row.interested) };
      setCounts(map);
      const r: Record<string, Rsvp> = {};
      for (const row of mine ?? []) r[row.event_id] = row.status;
      setRsvps(r);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    return events
      .map((e) => ({
        event: e,
        distance:
          location && e.latitude != null && e.longitude != null
            ? distanceKm(location, { latitude: e.latitude, longitude: e.longitude })
            : undefined,
      }))
      .filter(({ event, distance }) => {
        if (scope === 'mine') return event.user_id === user?.id || !!rsvps[event.id];
        if (kind !== 'all' && event.kind !== kind) return false;
        if (radius !== 'any' && distance !== undefined && distance > Number(radius)) return false;
        return true;
      });
  }, [events, location, scope, kind, radius, user, rsvps]);

  const setRsvp = async (event: CommunityEvent, status: Rsvp | null) => {
    const prev = rsvps[event.id];
    setRsvps((r) => {
      const next = { ...r };
      if (status) next[event.id] = status;
      else delete next[event.id];
      return next;
    });
    setCounts((c) => {
      const cur = c[event.id] ?? { going: 0, interested: 0 };
      const next = { ...cur };
      if (prev) next[prev] = Math.max(0, next[prev] - 1);
      if (status) next[status] += 1;
      return { ...c, [event.id]: next };
    });
    const { error } = status
      ? await supabase.from('event_rsvps').upsert({ event_id: event.id, status }, { onConflict: 'event_id,user_id' })
      : await supabase.from('event_rsvps').delete().eq('event_id', event.id);
    if (error) {
      toast.error('Could not update your RSVP');
      load();
    }
  };

  const addToCalendar = async (event: CommunityEvent) => {
    const start = new Date(event.starts_at);
    const pad = (n: number) => String(n).padStart(2, '0');
    const { error } = await supabase.from('family_events').insert({
      title: event.title,
      kind: event.kind === 'eid' ? 'eid' : 'gathering',
      starts_on: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      start_time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      location: event.venue ?? event.address,
      notes: event.description,
    });
    if (error) return toast.error('Could not add to your calendar');
    toast.success('Added to your family calendar');
  };

  const report = async (event: CommunityEvent) => {
    const reason = window.prompt('What’s wrong with this event? (e.g. spam, inappropriate, wrong details)');
    if (!reason?.trim()) return;
    const { error } = await supabase.from('event_reports').insert({ event_id: event.id, reason: reason.trim().slice(0, 500) });
    if (error) {
      toast.error(error.code === '23505' ? 'You already reported this event' : 'Could not send report');
      return;
    }
    toast.success('Thank you — our team will review it.');
  };

  const remove = async (event: CommunityEvent) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    const { error } = await supabase.from('community_events').delete().eq('id', event.id);
    if (error) return toast.error('Could not delete event');
    setSelected(null);
    load();
  };

  const sel = selected;
  const selMeta = sel ? EVENT_KIND_META[sel.kind] : null;

  return (
    <AppShell>
      <PageHeader
        title="Community"
        description="Halaqas, community iftars, Eid prayers, fundraisers and volunteering happening near you."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/halal-places?category=mosque">
            <Landmark className="mr-2 h-4 w-4" /> Mosques near me
          </Link>
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Share an event
        </Button>
      </PageHeader>

      <Card className="mb-5">
        <CardContent className="space-y-4 p-4">
          <LocationPicker value={location} onChange={save} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-card p-1">
              {(
                [
                  ['upcoming', 'Upcoming'],
                  ['mine', 'My events'],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setScope(v)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium',
                    scope === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as CommunityEventKind | 'all')}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                {(Object.keys(EVENT_KIND_META) as CommunityEventKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {EVENT_KIND_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['10', '25', '50', '100'].map((r) => (
                  <SelectItem key={r} value={r}>
                    Within {r} km
                  </SelectItem>
                ))}
                <SelectItem value="any">Anywhere</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
        </p>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              {scope === 'mine' ? 'No events yet' : 'No upcoming events here yet'}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Run a halaqa, an iftar or a charity drive? Share it so families nearby can join.
            </p>
            <Button size="sm" className="mt-6" onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Share an event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visible.map(({ event, distance }) => (
            <EventCard
              key={event.id}
              event={event}
              distance={distance}
              counts={counts[event.id]}
              rsvp={rsvps[event.id]}
              onOpen={() => setSelected(event)}
            />
          ))}
        </div>
      )}

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {sel && selMeta && (
            <>
              <SheetHeader className="text-left">
                <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <selMeta.icon className="h-3.5 w-3.5" /> {selMeta.label}
                </p>
                <SheetTitle className="font-display text-xl">{sel.title}</SheetTitle>
                <SheetDescription>
                  {new Date(sel.starts_at).toLocaleString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {sel.ends_at &&
                    ` – ${new Date(sel.ends_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  variant={rsvps[sel.id] === 'going' ? 'default' : 'outline'}
                  onClick={() => setRsvp(sel, rsvps[sel.id] === 'going' ? null : 'going')}
                >
                  <Users className="mr-2 h-4 w-4" /> {rsvps[sel.id] === 'going' ? 'Going' : 'I’m going'}
                </Button>
                <Button
                  variant={rsvps[sel.id] === 'interested' ? 'default' : 'outline'}
                  onClick={() => setRsvp(sel, rsvps[sel.id] === 'interested' ? null : 'interested')}
                >
                  <Star className="mr-2 h-4 w-4" /> Interested
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {counts[sel.id]?.going ?? 0} going · {counts[sel.id]?.interested ?? 0} interested
              </p>

              <div className="mt-5 space-y-3 text-sm">
                {(sel.venue || sel.address) && (
                  <p className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      {sel.venue && <span className="block font-medium text-foreground">{sel.venue}</span>}
                      {sel.address && <span className="text-muted-foreground">{sel.address}</span>}
                    </span>
                  </p>
                )}
                {sel.organizer && (
                  <p className="text-muted-foreground">
                    Organised by <span className="font-medium text-foreground">{sel.organizer}</span>
                    {sel.contact ? ` · ${sel.contact}` : ''}
                  </p>
                )}
                {sel.description && <p className="whitespace-pre-line text-foreground/90">{sel.description}</p>}
                <p className="text-muted-foreground">{sel.is_free ? 'Free' : sel.price ?? 'Paid event'}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {sel.latitude != null && sel.longitude != null && (
                  <Button asChild variant="outline" size="sm">
                    <a href={directionsUrl(sel.latitude, sel.longitude)} target="_blank" rel="noreferrer">
                      <Navigation className="mr-2 h-4 w-4" /> Directions
                    </a>
                  </Button>
                )}
                {sel.online_url && (
                  <Button asChild variant="outline" size="sm">
                    <a href={sel.online_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Join online
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => addToCalendar(sel)}>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Add to calendar
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-4">
                {sel.user_id === user?.id ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(sel);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(sel)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => report(sel)}>
                    <Flag className="mr-2 h-4 w-4" /> Report
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} onSaved={load} />
    </AppShell>
  );
}
