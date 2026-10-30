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
import { tr, trn } from '@/lib/i18n';

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
      toast.error(tr('Type a street address first.'));
      return;
    }
    setFinding(true);
    try {
      const res = await callEdgeFunction<{ results: GeocodeResult[] }>('halal-places', {
        address: address.trim(),
      });
      setResults(res.results);
      if (res.results.length === 0) toast.message(tr('No matches — try adding the city.'));
    } catch (err) {
      toast.error(tr('Address search failed'), {
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
      setPoint({ ...pos, label: tr('My current position'), city: null, country: null });
      setResults([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr('Could not get your location.'));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error(tr('Please enter the place name.'));
      return;
    }
    if (!point) {
      toast.error(tr('Please set the location — search the address or use your position.'));
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
      toast.error(tr('Could not add the place'), { description: error.message });
      return;
    }
    toast.success(tr('Thank you — {0} will appear for everyone once Firdam has checked it', [name.trim()]));
    window.dispatchEvent(new Event(HALAL_PLACES_CHANGED));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tr('Add a halal place')}</DialogTitle>
          <DialogDescription>
            {tr('Know a halal shop, butcher, restaurant or mosque that isn\'t listed? Add it so other families can find it.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="place-name">{tr('Name')}</Label>
            <Input
              id="place-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr('e.g. Al-Madina Halal Meat')}
              maxLength={160}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{tr('Type')}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as HalalPlaceCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tr(CATEGORY_META[c].label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {category !== 'mosque' && (
              <div className="space-y-1.5">
                <Label>{tr('Halal status')}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CommunityHalalStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {tr(o.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tr(COMMUNITY_STATUS_OPTIONS.find((o) => o.value === status)?.hint)}
                </p>
              </div>
            )}
          </div>

          {category !== 'mosque' && (
            <div className="space-y-1.5">
              <Label>{tr('Halal certification')}</Label>
              <Select value={cert} onValueChange={setCert}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_CERTIFIED}>{tr(NOT_CERTIFIED)}</SelectItem>
                  {CERTIFICATION_BODIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {trn(c)}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_CERT}>{tr('Other…')}</SelectItem>
                </SelectContent>
              </Select>
              {cert === OTHER_CERT && (
                <Input
                  value={certOther}
                  onChange={(e) => setCertOther(e.target.value)}
                  placeholder={tr('Name of the certifying body')}
                />
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="place-address">{tr('Location')}</Label>
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
                placeholder={tr('Street address and city')}
              />
              <Button type="button" variant="outline" onClick={findAddress} disabled={finding}>
                {finding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="sr-only">{tr('Find address')}</span>
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
              {tr('I\'m here right now — use my position')}
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
                      <span className="text-foreground">{tr(r.label)}</span>
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
                <span>{tr('Location set:')} {tr(point.label)}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="place-phone">{tr('Phone (optional)')}</Label>
              <Input id="place-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="place-website">{tr('Website (optional)')}</Label>
              <Input
                id="place-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={tr('example.com')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="place-notes">{tr('Notes (optional)')}</Label>
            <Textarea
              id="place-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                category === 'mosque'
                  ? tr('Jumu’ah time, parking, sisters’ prayer area…')
                  : tr('What they sell, opening hours, anything families should know')
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tr('Cancel')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tr('Add place')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
