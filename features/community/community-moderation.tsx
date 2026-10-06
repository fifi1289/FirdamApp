'use client';

import { useCallback, useEffect, useState } from 'react';
import { EyeOff, Eye, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { CommunityEvent } from '@/types/database';

interface Reported {
  event: CommunityEvent;
  reasons: string[];
}

/** Admin view of reported community events. */
export function CommunityModeration() {
  const supabase = createSupabaseBrowserClient();
  const [items, setItems] = useState<Reported[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: reports } = await supabase.from('event_reports').select('event_id,reason');
    const ids = Array.from(new Set((reports ?? []).map((r) => r.event_id)));
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: events } = await supabase.from('community_events').select('*').in('id', ids);
    setItems(
      (events ?? []).map((event) => ({
        event,
        reasons: (reports ?? []).filter((r) => r.event_id === event.id).map((r) => r.reason),
      }))
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (e: CommunityEvent, status: 'active' | 'hidden') => {
    const { error } = await supabase.from('community_events').update({ status }).eq('id', e.id);
    if (error) return toast.error('Update failed');
    if (status === 'active') await supabase.from('event_reports').delete().eq('event_id', e.id);
    toast.success(status === 'hidden' ? 'Event hidden' : 'Event restored and reports cleared');
    load();
  };

  const remove = async (e: CommunityEvent) => {
    if (!window.confirm(`Delete "${e.title}" permanently?`)) return;
    const { error } = await supabase.from('community_events').delete().eq('id', e.id);
    if (error) return toast.error('Delete failed');
    load();
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
      </p>
    );
  }
  if (items.length === 0) return <p className="py-8 text-sm text-muted-foreground">No reported events.</p>;

  return (
    <div className="space-y-3">
      {items.map(({ event, reasons }) => (
        <Card key={event.id}>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.starts_at).toLocaleString()} · {event.venue ?? event.address ?? 'Online'}
                </p>
              </div>
              <Badge variant={event.status === 'hidden' ? 'secondary' : 'outline'}>
                {reasons.length} report{reasons.length === 1 ? '' : 's'} · {event.status}
              </Badge>
            </div>
            <ul className="list-disc pl-5 text-muted-foreground">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              {event.status === 'active' ? (
                <Button size="sm" variant="outline" onClick={() => setStatus(event, 'hidden')}>
                  <EyeOff className="mr-1.5 h-4 w-4" /> Hide
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setStatus(event, 'active')}>
                  <Eye className="mr-1.5 h-4 w-4" /> Restore
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(event)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
