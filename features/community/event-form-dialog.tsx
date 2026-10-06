'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Search } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { callEdgeFunction } from '@/lib/supabase/functions';
import type { CommunityEvent, CommunityEventKind } from '@/types/database';
import { AUDIENCES, EVENT_KIND_META } from '@/features/community/community-config';

interface GeoResult {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event?: CommunityEvent | null;
  onSaved: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<CommunityEventKind>('halaqa');
  const [audience, setAudience] = useState<CommunityEvent['audience']>('everyone');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [finding, setFinding] = useState(false);
  const [online, setOnline] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [contact, setContact] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? '');
    setKind(event?.kind ?? 'halaqa');
    setAudience(event?.audience ?? 'everyone');
    setStarts(toLocalInput(event?.starts_at ?? null));
    setEnds(toLocalInput(event?.ends_at ?? null));
    setVenue(event?.venue ?? '');
    setAddress(event?.address ?? '');
    setPoint(event?.latitude != null && event?.longitude != null ? { latitude: event.latitude, longitude: event.longitude } : null);
    setResults([]);
    setOnline(event?.online_url ?? '');
    setOrganizer(event?.organizer ?? '');
    setContact(event?.contact ?? '');
    setIsFree(event?.is_free ?? true);
    setPrice(event?.price ?? '');
    setDescription(event?.description ?? '');
  }, [open, event]);

  const find = async () => {
    if (address.trim().length < 4) return;
    setFinding(true);
    try {
      const res = await callEdgeFunction<{ results: GeoResult[] }>('halal-places', { address: address.trim() });
      setResults(res.results);
      if (!res.results.length) toast.message('No matches — try adding the city.');
    } catch {
      toast.error('Address search failed');
    } finally {
      setFinding(false);
    }
  };

  const save = async () => {
    if (title.trim().length < 3) return toast.error('Give the event a title.');
    if (!starts) return toast.error('Choose when it starts.');
    if (!point && !online.trim()) return toast.error('Add the venue address, or an online link.');
    if (online && !/^https:\/\//i.test(online.trim())) return toast.error('The online link must start with https://');
    const row = {
      title: title.trim(),
      kind,
      audience,
      starts_at: new Date(starts).toISOString(),
      ends_at: ends ? new Date(ends).toISOString() : null,
      venue: venue.trim() || null,
      address: address.trim() || null,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
      online_url: online.trim() || null,
      organizer: organizer.trim() || null,
      contact: contact.trim() || null,
      is_free: isFree,
      price: isFree ? null : price.trim() || null,
      description: description.trim() || null,
    };
    setSaving(true);
    const { error } = event
      ? await supabase.from('community_events').update(row).eq('id', event.id)
      : await supabase.from('community_events').insert(row);
    setSaving(false);
    if (error) {
      toast.error('Could not save event', { description: error.message });
      return;
    }
    toast.success(event ? 'Event updated' : 'Event posted — jazakAllahu khayran!');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit event' : 'Share a community event'}</DialogTitle>
          <DialogDescription>Halaqas, iftars, Eid prayers, fundraisers — let families near you know.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="e.g. Weekly Tafsir circle" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as CommunityEventKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENT_KIND_META) as CommunityEventKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {EVENT_KIND_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>For</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as CommunityEvent['audience'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Starts</Label>
              <Input id="ev-start" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">Ends (optional)</Label>
              <Input id="ev-end" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-venue">Venue</Label>
            <Input id="ev-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Ottawa Main Mosque, hall B" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-address">Address</Label>
            <div className="flex gap-2">
              <Input
                id="ev-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setPoint(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    find();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={find} disabled={finding} aria-label="Find address">
                {finding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {results.length > 0 && !point && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPoint({ latitude: r.latitude, longitude: r.longitude });
                        setAddress(r.label);
                        setResults([]);
                      }}
                      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {point && (
              <p className="flex items-center gap-1.5 text-xs text-brand-sage">
                <CheckCircle2 className="h-3.5 w-3.5" /> Location set
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-online">Online link (optional)</Label>
            <Input id="ev-online" value={online} onChange={(e) => setOnline(e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-org">Organiser</Label>
              <Input id="ev-org" value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-contact">Contact</Label>
              <Input id="ev-contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <Label htmlFor="ev-free" className="text-sm">
              Free to attend
            </Label>
            <Switch id="ev-free" checked={isFree} onCheckedChange={setIsFree} />
          </div>
          {!isFree && (
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price, e.g. $10 per family" />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Details</Label>
            <Textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={3000} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {event ? 'Save' : 'Post event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
