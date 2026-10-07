'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  MapPin,
  Phone,
  Plane,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationPicker } from '@/components/location/location-picker';
import { UpgradeDialog, UsageNote } from '@/components/plan/upgrade-prompt';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { callEdgeFunction } from '@/lib/supabase/functions';
import { directionsUrl, distanceKm, formatDistance, useSavedLocation } from '@/lib/geo/location';
import { usePlan } from '@/lib/plan/plan';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/database';
import { DirectoryList } from '@/features/directory/directory-list';
import { TRAVEL_CATEGORIES } from '@/features/directory/directory-config';
import { HAJJ_DAYS, TRAVEL_TIPS, TRIP_KINDS, UMRAH_STEPS } from '@/features/travel/travel-config';
import { TripFormDialog } from '@/features/travel/trip-form-dialog';

interface OsmAgency {
  key: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  muslimFocused: boolean;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

function TripCard({ trip }: { trip: Trip }) {
  const meta = TRIP_KINDS[trip.kind];
  const Icon = meta.icon;
  const d = daysUntil(trip.start_date);
  const done = trip.checklist.filter((c) => c.done).length;
  const pct = trip.checklist.length ? Math.round((done / trip.checklist.length) * 100) : 0;
  return (
    <Link href={`/dashboard/travel/${trip.id}`} className="group">
      <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="bg-girih relative bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid p-5 text-brand-linen">
          <Icon className="absolute right-4 top-4 h-10 w-10 text-brand-gold/40" />
          <p className="text-xs font-medium uppercase tracking-wider text-brand-gold">{meta.label}</p>
          <p className="mt-1 font-display text-xl font-semibold">{trip.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-linen/80">
            <MapPin className="h-3.5 w-3.5" /> {trip.destination_label}
          </p>
        </div>
        <CardContent className="space-y-3 p-4 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {trip.start_date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(`${trip.start_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {trip.travellers}
            </span>
          </div>
          {d !== null && (
            <p className="font-medium text-foreground">
              {d > 1 ? `${d} days to go` : d === 1 ? 'Tomorrow!' : d === 0 ? 'Today — safe travels!' : 'Completed'}
            </p>
          )}
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Packing</span>
              <span>
                {done}/{trip.checklist.length}
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NearbyAgencies() {
  const { location, save } = useSavedLocation();
  const [radius, setRadius] = useState('10');
  const [agencies, setAgencies] = useState<OsmAgency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    callEdgeFunction<{ agencies: OsmAgency[] }>('halal-places', {
      kind: 'travel',
      lat: location.latitude.toFixed(5),
      lng: location.longitude.toFixed(5),
      radius: Number(radius) * 1000,
    })
      .then((r) => {
        if (cancelled) return;
        const sorted = r.agencies
          .map((a) => ({ ...a, d: distanceKm(location, a) }))
          .sort((a, b) => Number(b.muslimFocused) - Number(a.muslimFocused) || a.d - b.d);
        setAgencies(sorted);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load agencies'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [location, radius]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <LocationPicker value={location} onChange={save} className="flex-1" />
        <Select value={radius} onValueChange={setRadius}>
          <SelectTrigger className="sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['5', '10', '25'].map((r) => (
              <SelectItem key={r} value={r}>
                Within {r} km
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!location ? (
        <p className="text-sm text-muted-foreground">Set your location to see travel agencies near you.</p>
      ) : loading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding travel agencies…
        </p>
      ) : error ? (
        <p className="text-sm text-muted-foreground">Travel agency data is temporarily unavailable ({error}).</p>
      ) : agencies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No travel agencies found nearby. Try a wider radius.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {agencies.map((a) => (
            <Card key={a.key} className={cn(a.muslimFocused && 'border-primary/30')}>
              <CardContent className="p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{a.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistance(distanceKm(location, a))}
                  </span>
                </div>
                {a.muslimFocused && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3 w-3" /> Hajj, Umrah or Muslim travel
                  </p>
                )}
                {a.address && <p className="mt-1 text-xs text-muted-foreground">{a.address}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {a.phone && (
                    <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {a.phone}
                    </a>
                  )}
                  {a.website && (
                    <a
                      href={/^https?:/.test(a.website) ? a.website : `https://${a.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" /> Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <a
                    href={directionsUrl(a.latitude, a.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Directions
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        From OpenStreetMap. These agencies are not verified by Firdam — always check licences (e.g.
        TICO in Ontario, ATOL in the UK) and reviews before booking.
      </p>
    </div>
  );
}

function Guide() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground">The steps of Umrah</h3>
          <ol className="mt-4 space-y-4">
            {UMRAH_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <div className="space-y-5">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground">The days of Hajj</h3>
            <ul className="mt-4 space-y-3">
              {HAJJ_DAYS.map((d) => (
                <li key={d.day} className="rounded-xl border border-border p-3">
                  <p className="text-xs font-medium text-primary">{d.day}</p>
                  <p className="font-medium text-foreground">{d.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{d.detail}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground">Travel tips for Muslims</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {TRAVEL_TIPS.map((t) => (
                <li key={t} className="flex gap-2">
                  <Plane className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <p className="flex gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          A brief overview to help you prepare. Learn the rulings in detail from a qualified scholar or
          your Hajj/Umrah group before you travel.
        </p>
      </div>
    </div>
  );
}

export function TravelDashboard() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { atLimit, limit } = usePlan();
  const [tab, setTab] = useState('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && ['trips', 'agencies', 'guide'].includes(t)) setTab(t);
    supabase
      .from('trips')
      .select('*')
      .order('start_date', { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load trips:', error.message);
        setTrips(data ?? []);
        setLoading(false);
      });
  }, [supabase]);

  const newTrip = () => {
    if (atLimit('trips', trips.length)) {
      setUpgradeOpen(true);
      return;
    }
    setFormOpen(true);
  };

  const upcoming = trips.filter((t) => !t.end_date || (daysUntil(t.end_date) ?? 0) >= 0);
  const past = trips.filter((t) => t.end_date && (daysUntil(t.end_date) ?? 0) < 0);

  return (
    <AppShell>
      <PageHeader
        title="Travel"
        description="Plan halal-friendly trips, prepare for Umrah and Hajj, and find trusted travel agencies."
      >
        <Button size="sm" onClick={newTrip}>
          <Plus className="mr-2 h-4 w-4" /> Plan a trip
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="trips">My trips</TabsTrigger>
          <TabsTrigger value="agencies">Agencies & operators</TabsTrigger>
          <TabsTrigger value="guide">Umrah & Hajj guide</TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="mt-0 space-y-6">
          {loading ? (
            <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading trips…
            </p>
          ) : trips.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center px-6 py-16 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Plane className="h-7 w-7" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-foreground">Where to next?</h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Plan a holiday, a family visit or your Umrah. We’ll get prayer times, the Qibla, halal
                  food and a packing list ready for your destination.
                </p>
                <Button size="sm" className="mt-6" onClick={newTrip}>
                  <Plus className="mr-2 h-4 w-4" /> Plan a trip
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
              {past.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Past trips</h2>
                  <div className="grid grid-cols-1 gap-5 opacity-80 md:grid-cols-2 xl:grid-cols-3">
                    {past.map((t) => (
                      <TripCard key={t.id} trip={t} />
                    ))}
                  </div>
                </div>
              )}
              <UsageNote used={trips.length} limit={limit('trips')} label="trips" onUpgrade={() => setUpgradeOpen(true)} />
            </>
          )}
        </TabsContent>

        <TabsContent value="agencies" className="mt-0 space-y-8">
          <section>
            <h2 className="mb-1 font-semibold text-foreground">Firdam-listed travel businesses</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Hajj & Umrah operators, travel agencies and halal-friendly stays reviewed by the Firdam team.
            </p>
            <DirectoryList
              categories={TRAVEL_CATEGORIES}
              defaultCategory="hajj_umrah"
              emptyHint="We’re onboarding trusted Hajj & Umrah operators and travel agencies. Run one? List it for free."
            />
          </section>
          <section>
            <h2 className="mb-1 font-semibold text-foreground">Travel agencies near you</h2>
            <p className="mb-4 text-sm text-muted-foreground">All travel agencies on the map around you.</p>
            <NearbyAgencies />
          </section>
        </TabsContent>

        <TabsContent value="guide" className="mt-0">
          <Guide />
        </TabsContent>
      </Tabs>

      <TripFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={(id) => router.push(`/dashboard/travel/${id}`)} />
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} limitKey="trips" />
    </AppShell>
  );
}
