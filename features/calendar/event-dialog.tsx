'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { FamilyEvent, FamilyEventKind, FamilyMember } from '@/types/database';
import { EDITABLE_KINDS, EVENT_KINDS } from '@/features/calendar/calendar-config';
import { FAMILY_EVENTS_CHANGED } from '@/features/calendar/use-calendar';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: FamilyEvent | null;
  defaultDate: string;
  members: FamilyMember[];
}

export function EventDialog({ open, onOpenChange, event, defaultDate, members }: EventDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<FamilyEventKind>('gathering');
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [yearly, setYearly] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? '');
    setKind(event?.kind ?? 'gathering');
    setDate(event?.starts_on ?? defaultDate);
    setAllDay(!event?.start_time);
    setStartTime(event?.start_time?.slice(0, 5) ?? '');
    setEndTime(event?.end_time?.slice(0, 5) ?? '');
    setLocation(event?.location ?? '');
    setNotes(event?.notes ?? '');
    setMemberIds(event?.member_ids ?? []);
    setYearly(event?.repeats_yearly ?? false);
  }, [open, event, defaultDate]);

  useEffect(() => {
    if (!event && (kind === 'anniversary' || kind === 'birthday')) setYearly(true);
  }, [kind, event]);

  const save = async () => {
    if (!title.trim()) {
      toast.error('Give the event a title.');
      return;
    }
    if (!date) {
      toast.error('Choose a date.');
      return;
    }
    const row = {
      title: title.trim(),
      kind,
      starts_on: date,
      start_time: allDay ? null : startTime || null,
      end_time: allDay ? null : endTime || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      member_ids: memberIds,
      repeats_yearly: yearly,
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    const { error } = event
      ? await supabase.from('family_events').update(row).eq('id', event.id)
      : await supabase.from('family_events').insert(row);
    setSaving(false);
    if (error) {
      toast.error('Could not save event', { description: error.message });
      return;
    }
    toast.success(event ? 'Event updated' : 'Added to the family calendar');
    window.dispatchEvent(new Event(FAMILY_EVENTS_CHANGED));
    onOpenChange(false);
  };

  const remove = async () => {
    if (!event) return;
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    setSaving(true);
    const { error } = await supabase.from('family_events').delete().eq('id', event.id);
    setSaving(false);
    if (error) {
      toast.error('Could not delete', { description: error.message });
      return;
    }
    window.dispatchEvent(new Event(FAMILY_EVENTS_CHANGED));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit event' : 'New family event'}</DialogTitle>
          <DialogDescription>Ceremonies, gatherings, school events and appointments.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Yusuf's Aqiqah"
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as FamilyEventKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {EVENT_KINDS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <Label htmlFor="ev-allday" className="text-sm">
              All day
            </Label>
            <Switch id="ev-allday" checked={allDay} onCheckedChange={setAllDay} />
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">Starts</Label>
                <Input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">Ends</Label>
                <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ev-location">Location (optional)</Label>
            <Input
              id="ev-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Grandma's house, Ottawa Main Mosque"
              maxLength={200}
            />
          </div>

          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label>Who&apos;s involved</Label>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const on = memberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setMemberIds((prev) => (on ? prev.filter((id) => id !== m.id) : [...prev, m.id]))
                      }
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {m.first_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <Label htmlFor="ev-yearly" className="text-sm">
              Repeats every year
            </Label>
            <Switch id="ev-yearly" checked={yearly} onCheckedChange={setYearly} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-notes">Notes (optional)</Label>
            <Textarea
              id="ev-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="What to bring, who's cooking, dress code…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between sm:gap-0">
          {event ? (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={saving}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {event ? 'Save' : 'Add event'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
