'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { LocationPicker } from '@/components/location/location-picker';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SavedLocation } from '@/lib/geo/location';
import type { Trip, TripKind } from '@/types/database';
import { TRIP_KINDS, defaultChecklist } from '@/features/travel/travel-config';

export function TripFormDialog({
  open,
  onOpenChange,
  trip,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  trip?: Trip | null;
  onSaved: (id: string) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TripKind>('holiday');
  const [dest, setDest] = useState<SavedLocation | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [travellers, setTravellers] = useState('2');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(trip?.name ?? '');
    setKind(trip?.kind ?? 'holiday');
    setDest(
      trip
        ? {
            id: -1,
            name: trip.destination_label,
            country: '',
            region: '',
            latitude: trip.latitude,
            longitude: trip.longitude,
            label: trip.destination_label,
          }
        : null
    );
    setStart(trip?.start_date ?? '');
    setEnd(trip?.end_date ?? '');
    setTravellers(String(trip?.travellers ?? 2));
    setBudget(trip?.budget != null ? String(trip.budget) : '');
    setNotes(trip?.notes ?? '');
  }, [open, trip]);

  const save = async () => {
    if (!dest) return toast.error('Choose your destination.');
    if (start && end && end < start) return toast.error('The return date is before the departure date.');
    const people = Math.max(1, Math.min(50, Number(travellers) || 1));
    const row = {
      name: name.trim() || `${TRIP_KINDS[kind].label} — ${dest.name || dest.label}`,
      kind,
      destination_label: dest.label,
      latitude: dest.latitude,
      longitude: dest.longitude,
      start_date: start || null,
      end_date: end || null,
      travellers: people,
      budget: budget ? Number(budget) : null,
      notes: notes.trim() || null,
    };
    setSaving(true);
    const result = trip
      ? await supabase
          .from('trips')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', trip.id)
          .select('id')
          .single()
      : await supabase
          .from('trips')
          .insert({ ...row, checklist: defaultChecklist(kind, people) })
          .select('id')
          .single();
    setSaving(false);
    if (result.error) {
      toast.error('Could not save trip', { description: result.error.message });
      return;
    }
    onOpenChange(false);
    onSaved(result.data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{trip ? 'Edit trip' : 'Plan a trip'}</DialogTitle>
          <DialogDescription>
            We’ll prepare prayer times, the Qibla, halal food and a packing list for your destination.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type of trip</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as TripKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIP_KINDS) as TripKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TRIP_KINDS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-trav">Travellers</Label>
              <Input id="t-trav" inputMode="numeric" value={travellers} onChange={(e) => setTravellers(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Destination</Label>
            <LocationPicker
              value={dest}
              onChange={setDest}
              hideLocateButton
              placeholder={kind === 'umrah' || kind === 'hajj' ? 'Makkah' : 'Search a city — e.g. Istanbul'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Trip name (optional)</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family Umrah 2027" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-start">Departure</Label>
              <Input id="t-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-end">Return</Label>
              <Input id="t-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-budget">Budget (optional)</Label>
            <Input id="t-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-notes">Notes</Label>
            <Textarea id="t-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Hotel, flight numbers, people to visit…" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {trip ? 'Save' : 'Create trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
