'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Loader2,
  MapPin,
  Moon,
  Pencil,
  Plus,
  Trash2,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchPrayerDay, format12h, PRAYER_ORDER, usePrayerSettings, type PrayerDay } from '@/lib/prayer/prayer';
import { cn } from '@/lib/utils';
import type { ChecklistItem, Trip } from '@/types/database';
import { QiblaCompass } from '@/features/prayer-times/qibla-compass';
import { TRIP_KINDS } from '@/features/travel/travel-config';
import { TripFormDialog } from '@/features/travel/trip-form-dialog';

export function TripDetailPage({ tripId }: { tripId: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { settings, ready } = usePrayerSettings();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [prayer, setPrayer] = useState<PrayerDay | null>(null);
  const [newItem, setNewItem] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();
    setTrip(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    if (!trip || !ready) return;
    const day = trip.start_date && new Date(`${trip.start_date}T00:00:00`) > new Date() ? new Date(`${trip.start_date}T12:00:00`) : new Date();
    fetchPrayerDay(trip.latitude, trip.longitude, settings, day)
      .then(setPrayer)
      .catch(() => setPrayer(null));
  }, [trip, settings, ready]);

  const groups = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of trip?.checklist ?? []) {
      const g = item.group ?? 'My items';
      map.set(g, [...(map.get(g) ?? []), item]);
    }
    return Array.from(map.entries());
  }, [trip]);

  const saveChecklist = async (checklist: ChecklistItem[]) => {
    if (!trip) return;
    setTrip({ ...trip, checklist });
    const { error } = await supabase
      .from('trips')
      .update({ checklist, updated_at: new Date().toISOString() })
      .eq('id', trip.id);
    if (error) {
      toast.error('Could not save checklist');
      load();
    }
  };

  if (loading) {
    return (
      <AppShell>
        <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trip…
        </p>
      </AppShell>
    );
  }
  if (!trip) {
    return (
      <AppShell>
        <p className="py-20 text-center text-sm text-muted-foreground">
          Trip not found. <Link href="/dashboard/travel" className="text-primary hover:underline">Back to Travel</Link>
        </p>
      </AppShell>
    );
  }

  const meta = TRIP_KINDS[trip.kind];
  const Icon = meta.icon;
  const done = trip.checklist.filter((c) => c.done).length;
  const daysTo = trip.start_date
    ? Math.round((new Date(`${trip.start_date}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000)
    : null;
  const nights =
    trip.start_date && trip.end_date
      ? Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000)
      : null;
  const halalLink = `/dashboard/halal-places?lat=${trip.latitude}&lng=${trip.longitude}&label=${encodeURIComponent(trip.destination_label)}`;
  const pilgrimage = trip.kind === 'umrah' || trip.kind === 'hajj';

  const remove = async () => {
    if (!window.confirm(`Delete "${trip.name}"?`)) return;
    const { error } = await supabase.from('trips').delete().eq('id', trip.id);
    if (error) return toast.error('Could not delete trip');
    toast.success('Trip deleted');
    router.push('/dashboard/travel');
  };

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/travel">
            <ArrowLeft className="mr-2 h-4 w-4" /> Travel
          </Link>
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-girih relative bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid p-6 text-brand-linen md:p-8">
          <Icon className="absolute right-6 top-6 h-16 w-16 text-brand-gold/30" />
          <p className="text-sm font-medium text-brand-gold">{meta.label}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{trip.name}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-brand-linen/85">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {trip.destination_label}
            </span>
            {trip.start_date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {new Date(`${trip.start_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {trip.end_date &&
                  ` – ${new Date(`${trip.end_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                {nights !== null && ` · ${nights} night${nights === 1 ? '' : 's'}`}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {trip.travellers} traveller{trip.travellers === 1 ? '' : 's'}
            </span>
          </div>
          {daysTo !== null && daysTo >= 0 && (
            <p className="mt-5 inline-block rounded-xl bg-white/10 px-4 py-2 font-display text-lg font-semibold backdrop-blur">
              {daysTo === 0 ? 'You travel today — safe journey!' : `${daysTo} day${daysTo === 1 ? '' : 's'} to go`}
            </p>
          )}
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Packing checklist</h2>
                <span className="text-xs text-muted-foreground">
                  {done}/{trip.checklist.length} packed
                </span>
              </div>
              <Progress value={trip.checklist.length ? (done / trip.checklist.length) * 100 : 0} className="mt-3 h-2" />
              <div className="mt-4 space-y-5">
                {groups.map(([group, items]) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                    <ul className="space-y-1">
                      {items.map((item) => (
                        <li key={item.id} className="group flex items-center gap-3 rounded-lg px-1 py-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              saveChecklist(trip.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)))
                            }
                            aria-label={item.done ? `Unpack ${item.text}` : `Pack ${item.text}`}
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                              item.done ? 'border-brand-sage bg-brand-sage text-white' : 'border-border'
                            )}
                          >
                            {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
                          </button>
                          <span className={cn('flex-1 text-sm', item.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                            {item.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => saveChecklist(trip.checklist.filter((c) => c.id !== item.id))}
                            aria-label={`Remove ${item.text}`}
                            className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newItem.trim()) return;
                  saveChecklist([
                    ...trip.checklist,
                    { id: crypto.randomUUID(), text: newItem.trim(), done: false, group: 'My items' },
                  ]);
                  setNewItem('');
                }}
              >
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add an item" />
                <Button type="submit" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {trip.notes && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold text-foreground">Notes</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{trip.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 font-semibold text-foreground">
                <Moon className="h-4 w-4 text-primary" /> Prayer times at your destination
              </h2>
              {prayer ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    For {prayer.gregorian.weekday}, {prayer.gregorian.date} · local time there
                  </p>
                  <ul className="mt-3 divide-y divide-border/70">
                    {PRAYER_ORDER.map((p) => (
                      <li key={p.key} className="flex justify-between py-2 text-sm">
                        <span className="text-foreground">{p.label}</span>
                        <span className="tabular-nums text-muted-foreground">{format12h(prayer.timings[p.key])}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              )}
            </CardContent>
          </Card>

          <QiblaCompass latitude={trip.latitude} longitude={trip.longitude} />

          <Link href={halalLink} className="block">
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UtensilsCrossed className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Halal food & mosques there</p>
                  <p className="text-xs text-muted-foreground">Open Halal Places for {trip.destination_label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {pilgrimage && (
            <Link href="/dashboard/travel?tab=agencies" className="block">
              <Card className="border-brand-gold/40 bg-brand-gold/10 transition-colors hover:border-brand-gold">
                <CardContent className="p-5 text-sm">
                  <p className="font-semibold text-foreground">Find a trusted {meta.label} operator</p>
                  <p className="mt-1 text-muted-foreground">Compare Firdam-listed operators and send enquiries in one place.</p>
                </CardContent>
              </Card>
            </Link>
          )}

          <Link href="/dashboard/finance?tab=goals" className="block">
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Save for this trip</p>
                  <p className="text-xs text-muted-foreground">
                    {trip.budget ? `Budget ${trip.budget.toLocaleString()}` : 'Create a savings goal in Finance'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <TripFormDialog open={editOpen} onOpenChange={setEditOpen} trip={trip} onSaved={() => load()} />
    </AppShell>
  );
}
