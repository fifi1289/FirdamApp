'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, LocateFixed, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { callEdgeFunction } from '@/lib/supabase/functions';
import { getDevicePosition } from '@/lib/geo/location';
import { cn } from '@/lib/utils';
import type { CommunityHalalStatus, HalalPlaceCategory } from '@/types/database';
import {
  CATEGORY_META,
  CERTIFICATION_BODIES,
  COMMUNITY_STATUS_OPTIONS,
  NOT_CERTIFIED,
} from '@/features/halal-places/halal-places-config';
import { HALAL_PLACES_CHANGED } from '@/features/halal-places/use-halal-places';

interface GeocodeResult {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
}

interface PickedPoint {
  latitude: number;
  longitude: number;
  label: string;
  city: string | null;
  country: string | null;
}

const OTHER_CERT = '__other__';
const CATEGORIES: HalalPlaceCategory[] = ['grocery', 'butcher', 'restaurant', 'cafe', 'mosque', 'other'];

interface AddPlaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPlaceDialog({ open, onOpenChange }: AddPlaceDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HalalPlaceCategory>('grocery');
  const [status, setStatus] = useState<CommunityHalalStatus>('halal');
  const [cert, setCert] = useState<string>(NOT_CERTIFIED);
  const [certOther, setCertOther] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [point, setPoint] = useState<PickedPoint | null>(null);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [finding, setFinding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setCategory('grocery');
    setStatus('halal');
    setCert(NOT_CERTIFIED);
    setCertOther('');
    setAddress('');
    setPhone('');
    setWebsite('');
    setNotes('');
    setPoint(null);
    setResults([]);
  }, [open]);

  const findAddress = async () => {
    if (address.trim().length < 4) {
      toast.error('Type a street address first.');
      return;
    }
    setFinding(true);
    try {
      const res = await callEdgeFunction<{ results: GeocodeResult[] }>('halal-places', {
        address: address.trim(),
      });
      setResults(res.results);
      if (res.results.length === 0) toast.message('No matches — try adding the city.');
    } catch (err) {
      toast.error('Address search failed', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setFinding(false);
    }
  };

  const useHere = async () => {
    setLocating(true);
    try {
      const pos = await getDevicePosition();
      setPoint({ ...pos, label: 'My current position', city: null, country: null });
      setResults([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('Please enter the place name.');
      return;
    }
    if (!point) {
      toast.error('Please set the location — search the address or use your position.');
      return;
    }
    const certification =
      category === 'mosque'
        ? null
        : cert === OTHER_CERT
          ? certOther.trim() || null
          : cert === NOT_CERTIFIED
            ? null
            : cert;

    setSaving(true);
    const { error } = await supabase.from('halal_places').insert({
      name: name.trim(),
      category,
      halal_status: status,
      certification,
      address: address.trim() || (point.label !== 'My current position' ? point.label : null),
      city: point.city,
      country: point.country,
      latitude: point.latitude,
      longitude: point.longitude,
      phone: phone.trim() || null,
      website: website.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not add the place', { description: error.message });
      return;
    }
    toast.success(`${name.trim()} was added — jazakAllahu khayran for helping others find it`);
    window.dispatchEvent(new Event(HALAL_PLACES_CHANGED));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a halal place</DialogTitle>
          <DialogDescription>
            Know a halal shop, butcher, restaurant or mosque that isn&apos;t listed? Add it so other
            families can find it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="place-name">Name</Label>
            <Input
              id="place-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Al-Madina Halal Meat"
              maxLength={160}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as HalalPlaceCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {category !== 'mosque' && (
              <div className="space-y-1.5">
                <Label>Halal status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CommunityHalalStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {COMMUNITY_STATUS_OPTIONS.find((o) => o.value === status)?.hint}
                </p>
              </div>
            )}
          </div>

          {category !== 'mosque' && (
            <div className="space-y-1.5">
              <Label>Halal certification</Label>
              <Select value={cert} onValueChange={setCert}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_CERTIFIED}>{NOT_CERTIFIED}</SelectItem>
                  {CERTIFICATION_BODIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_CERT}>Other…</SelectItem>
                </SelectContent>
              </Select>
              {cert === OTHER_CERT && (
                <Input
                  value={certOther}
                  onChange={(e) => setCertOther(e.target.value)}
                  placeholder="Name of the certifying body"
                />
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="place-address">Location</Label>
            <div className="flex gap-2">
              <Input
                id="place-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setPoint(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    findAddress();
                  }
                }}
                placeholder="Street address and city"
              />
              <Button type="button" variant="outline" onClick={findAddress} disabled={finding}>
                {finding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="sr-only">Find address</span>
              </Button>
            </div>
            <button
              type="button"
              onClick={useHere}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" />
              )}
              I&apos;m here right now — use my position
            </button>

            {results.length > 0 && !point && (
              <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPoint({
                          latitude: r.latitude,
                          longitude: r.longitude,
                          label: r.label,
                          city: r.city,
                          country: r.country,
                        });
                        setResults([]);
                      }}
                      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-foreground">{r.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {point && (
              <p
                className={cn(
                  'flex items-start gap-1.5 rounded-lg bg-brand-sage/10 px-2.5 py-2 text-xs text-brand-sage'
                )}
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Location set: {point.label}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="place-phone">Phone (optional)</Label>
              <Input id="place-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="place-website">Website (optional)</Label>
              <Input
                id="place-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="place-notes">Notes (optional)</Label>
            <Textarea
              id="place-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                category === 'mosque'
                  ? 'Jumu’ah time, parking, sisters’ prayer area…'
                  : 'What they sell, opening hours, anything families should know'
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add place
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
