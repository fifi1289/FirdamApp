'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Heart,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationPicker } from '@/components/location/location-picker';
import { PlacesMap, type MapMarker } from '@/components/map/places-map';
import { useSavedLocation, formatDistance, distanceKm, type SavedLocation } from '@/lib/geo/location';
import { cn } from '@/lib/utils';
import type { HalalPlaceCategory } from '@/types/database';
import {
  CATEGORY_META,
  FILTER_CATEGORIES,
  HALAL_STATUS_LABEL,
  RADIUS_OPTIONS,
  type RadiusKm,
} from '@/features/halal-places/halal-places-config';
import { useHalalPlaces, useSavedPlaces } from '@/features/halal-places/use-halal-places';
import { PlaceDetailSheet } from '@/features/halal-places/place-detail-sheet';
import { AddPlaceDialog } from '@/features/halal-places/add-place-dialog';
import { StarRating } from '@/features/halal-places/star-rating';
import type { HalalPlace, PlaceRating } from '@/features/halal-places/types';
import { tr, trn } from '@/lib/i18n';

type Tab = 'nearby' | 'saved';
type SortKey = 'distance' | 'rating' | 'name';

function PlaceRow({
  place,
  rating,
  selected,
  saved,
  onSelect,
}: {
  place: HalalPlace;
  rating?: PlaceRating;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
}) {
  const meta = CATEGORY_META[place.category];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-all duration-200',
        selected
          ? 'border-primary/50 shadow-md ring-2 ring-primary/15'
          : 'border-border/70 hover:border-primary/30 hover:shadow-sm'
      )}
    >
      <span
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
          meta.chip
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{trn(place.name)}</span>
          {place.distanceKm !== undefined && (
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {formatDistance(place.distanceKm)}
            </span>
          )}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{tr(meta.label)}</span>
          {place.category !== 'mosque' && (
            <>
              <span aria-hidden>·</span>
              <span className="text-brand-sage">{trn(HALAL_STATUS_LABEL[place.halalStatus])}</span>
            </>
          )}
          {place.certification && (
            <span className="inline-flex items-center gap-0.5 text-primary">
              <BadgeCheck className="h-3.5 w-3.5" />
              {tr('Certified')}
            </span>
          )}
          {saved && <Heart className="h-3.5 w-3.5 fill-destructive text-destructive" />}
        </span>
        {place.address && (
          <span className="mt-1 block truncate text-xs text-muted-foreground/90">{place.address}</span>
        )}
        {rating && rating.reviewCount > 0 && (
          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <StarRating value={rating.avgRating} />
            <span className="font-medium text-foreground">{rating.avgRating.toFixed(1)}</span>
            <span>({trn(rating.reviewCount)})</span>
            {rating.confirmations > 0 && (
              <span className="inline-flex items-center gap-0.5 text-brand-sage">
                <ShieldCheck className="h-3 w-3" />
                {trn(rating.confirmations)}
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {trn(label)}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 text-[10px] tabular-nums',
            active ? 'bg-primary-foreground/20' : 'bg-muted'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function HalalPlacesDashboard() {
  const { location, ready } = useSavedLocation();
  const [radius, setRadius] = useState<RadiusKm>(5);
  const [category, setCategory] = useState<HalalPlaceCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  /** Same as the mobile app's toggle: also list food shops that may stock halal products. */
  const [includeStores, setIncludeStores] = useState(true);
  const [sort, setSort] = useState<SortKey>('distance');
  const [tab, setTab] = useState<Tab>('nearby');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Temporary location: a manual city search or a deep link (e.g. a trip
  // destination). Never saved — exploring halal places elsewhere must not
  // silently move the shared home location used by prayer times & Ramadan.
  const [override, setOverride] = useState<SavedLocation | null>(null);

  // Deep links: ?category=butcher, ?lat=..&lng=..&label=..
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('category');
    if (param && (FILTER_CATEGORIES as string[]).includes(param)) {
      setCategory(param as HalalPlaceCategory);
    }
    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    if (params.get('lat') && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      const label = params.get('label') || 'Destination';
      setOverride({ id: -2, name: label.split(',')[0] ?? label, country: '', region: '', latitude: lat, longitude: lng, label });
    }
  }, []);

  const activeLocation = override ?? location;
  const center = useMemo(
    () => (activeLocation ? { latitude: activeLocation.latitude, longitude: activeLocation.longitude } : null),
    [activeLocation]
  );
  const { places, ratings, loading, osmError, pending } = useHalalPlaces(center, radius, includeStores);
  const { saved, list: savedList, toggle } = useSavedPlaces();

  const counts = useMemo(() => {
    const c: Partial<Record<HalalPlaceCategory, number>> = {};
    for (const p of places) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [places]);

  const source: HalalPlace[] = useMemo(() => {
    if (tab === 'nearby') return places;
    return savedList.map((p) => ({
      ...p,
      distanceKm: center ? distanceKm(center, p) : undefined,
    }));
  }, [tab, places, savedList, center]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = source.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (certifiedOnly && !p.certification && p.category !== 'mosque') return false;
      if (q) {
        const hay = `${p.name} ${p.address ?? ''} ${p.cuisine ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sort === 'rating') {
      sorted.sort(
        (a, b) =>
          (ratings[b.key]?.avgRating ?? 0) - (ratings[a.key]?.avgRating ?? 0) ||
          (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
      );
    } else if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return sorted;
  }, [source, category, certifiedOnly, query, sort, ratings]);

  const markers: MapMarker[] = useMemo(
    () =>
      visible.slice(0, 300).map((p) => ({
        id: p.key,
        latitude: p.latitude,
        longitude: p.longitude,
        variant: CATEGORY_META[p.category].variant,
        glyph: CATEGORY_META[p.category].glyph,
        title: p.name,
      })),
    [visible]
  );

  const selected = useMemo(
    () => visible.find((p) => p.key === selectedKey) ?? source.find((p) => p.key === selectedKey) ?? null,
    [visible, source, selectedKey]
  );

  const openPlace = (key: string) => {
    setSelectedKey(key);
    setDetailOpen(true);
  };

  const onToggleSave = async (place: HalalPlace) => {
    try {
      const nowSaved = await toggle(place);
      toast.success(nowSaved ? tr('Saved to your places') : tr('Removed from saved places'));
    } catch (err) {
      toast.error(tr('Could not update saved places'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const hasFilters = category !== 'all' || certifiedOnly || query.trim() !== '';

  return (
    <AppShell>
      <PageHeader
        title={tr('Halal Places')}
        description={tr('Halal groceries, butchers, restaurants and mosques near you — wherever you live or travel.')}
      >
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {tr('Add a place')}
        </Button>
      </PageHeader>

      <Card className="mb-5 overflow-hidden">
        <CardContent className="bg-girih space-y-4 p-4 sm:p-5">
          <LocationPicker
            value={activeLocation}
            onChange={(loc) => {
              // A city search here is exploratory ("wherever you live or travel"):
              // keep it local so the home prayer location never moves silently.
              setOverride(loc);
            }}
          />

          {activeLocation && (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <CategoryChip
                  label={tr('All')}
                  count={tab === 'nearby' ? places.length : undefined}
                  active={category === 'all'}
                  onClick={() => setCategory('all')}
                />
                {FILTER_CATEGORIES.map((c) => (
                  <CategoryChip
                    key={c}
                    label={trn(CATEGORY_META[c].plural)}
                    count={tab === 'nearby' ? counts[c] ?? 0 : undefined}
                    active={category === c}
                    onClick={() => setCategory(c)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch id="certified-only" checked={certifiedOnly} onCheckedChange={setCertifiedOnly} />
                  <Label htmlFor="certified-only" className="text-xs font-medium text-muted-foreground">
                    {tr('Certified only')}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="include-stores" checked={includeStores} onCheckedChange={setIncludeStores} />
                  <Label htmlFor="include-stores" className="text-xs font-medium text-muted-foreground">
                    {tr('Also show shops that may stock halal food')}
                  </Label>
                </div>
                <Select value={String(radius)} onValueChange={(v) => setRadius(Number(v) as RadiusKm)}>
                  <SelectTrigger className="h-9 w-[120px]" aria-label={tr('Search radius')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RADIUS_OPTIONS.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {tr('Within {0} km', [r])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!ready ? null : !activeLocation ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-7 w-7" />
            </span>
            <h2 className="mt-5 font-display text-lg font-semibold text-foreground">
              {tr('Where are you looking?')}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
              {tr('Use your location or search a city above to see halal shops, restaurants and mosques around you. Travelling soon? Search your destination to plan ahead.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-border bg-card p-1">
              {(
                [
                  ['nearby', 'Nearby'],
                  ['saved', `Saved${saved.size ? ` (${saved.size})` : ''}`],
                ] as [Tab, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                    tab === value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {trn(label)}
                </button>
              ))}
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tr('Filter by name or cuisine')}
                  className="h-9 pl-9"
                  aria-label={tr('Filter places')}
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[140px]" aria-label={tr('Sort places')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">{tr('Nearest')}</SelectItem>
                  <SelectItem value="rating">{tr('Top rated')}</SelectItem>
                  <SelectItem value="name">{tr('Name (A–Z)')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="inline-flex rounded-lg border border-border bg-card p-0.5 lg:hidden">
                <button
                  type="button"
                  aria-label={tr('List view')}
                  onClick={() => setMobileView('list')}
                  className={cn(
                    'rounded-md p-1.5',
                    mobileView === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={tr('Map view')}
                  onClick={() => setMobileView('map')}
                  className={cn(
                    'rounded-md p-1.5',
                    mobileView === 'map' ? 'bg-accent text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <MapIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {osmError && tab === 'nearby' && (
            <p className="mb-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              {tr('Map data is temporarily unavailable ({0}). Showing places added by the Firdam community only.', [osmError])}
            </p>
          )}

          {pending && tab === 'nearby' && !loading && (
            <p className="mb-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
              {tr('Firdam is gathering halal places for your area. Check back in a few minutes for the full list.')}
            </p>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div className={cn('space-y-2.5', mobileView === 'map' && 'hidden lg:block')}>
              {loading && tab === 'nearby' ? (
                <Card>
                  <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tr('Finding halal places near')} {trn(activeLocation.name) || tr('you')}…
                  </CardContent>
                </Card>
              ) : visible.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      {tab === 'saved' ? <Heart className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-foreground">
                      {tab === 'saved'
                        ? tr('No saved places yet')
                        : hasFilters
                          ? tr('Nothing matches these filters')
                          : tr('No halal places found here yet')}
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      {tab === 'saved'
                        ? tr('Tap the heart on a place to keep it here for quick access.')
                        : hasFilters
                          ? tr('Try another category or turn off “Certified only”.')
                          : tr('Try a wider radius — or be the first to add a place you trust.')}
                    </p>
                    {tab === 'nearby' && (
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {radius < 25 && !hasFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setRadius(
                                (RADIUS_OPTIONS.find((r) => r > radius) ?? 25) as RadiusKm
                              )
                            }
                          >
                            {tr('Search wider')}
                          </Button>
                        )}
                        {hasFilters ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCategory('all');
                              setCertifiedOnly(false);
                              setQuery('');
                            }}
                          >
                            {tr('Clear filters')}
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setAddOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {tr('Add a place')}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="px-1 text-xs text-muted-foreground">
                    {visible.length} {tr('place')}{visible.length === 1 ? '' : tr('s')}
                    {tab === 'nearby' && tr(' within {0} km of {1}', [radius, activeLocation.name || 'you'])}
                  </p>
                  <div className="space-y-2.5 lg:max-h-[calc(100vh-330px)] lg:overflow-y-auto lg:pr-1">
                    {visible.map((p) => (
                      <PlaceRow
                        key={p.key}
                        place={p}
                        rating={ratings[p.key]}
                        selected={selectedKey === p.key}
                        saved={saved.has(p.key)}
                        onSelect={() => openPlace(p.key)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className={cn(mobileView === 'list' && 'hidden lg:block')}>
              <PlacesMap
                center={center}
                markers={markers}
                selectedId={selectedKey}
                onSelect={openPlace}
                radiusKm={tab === 'nearby' ? radius : undefined}
                className="h-[60vh] lg:sticky lg:top-24 lg:h-[calc(100vh-300px)] lg:min-h-[420px]"
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
                {FILTER_CATEGORIES.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5">
                    <span
                      className={cn('inline-block h-2.5 w-2.5 rounded-full', `firdam-pin--${c}`)}
                      style={{ background: 'var(--pin)' }}
                    />
                    {tr(CATEGORY_META[c].label)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            {tr('Halal information comes from OpenStreetMap contributors and Firdam members, and can change. When in doubt, ask to see the store\'s current certificate.')}
          </p>
        </>
      )}

      <PlaceDetailSheet
        place={selected}
        rating={selected ? ratings[selected.key] : undefined}
        open={detailOpen && !!selected}
        onOpenChange={setDetailOpen}
        isSaved={selected ? saved.has(selected.key) : false}
        onToggleSave={onToggleSave}
      />

      <AddPlaceDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppShell>
  );
}
