'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface PendingPlace {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

/** Halal places added by families, waiting for an admin before anyone else sees them. */
export function HalalPlaceReview() {
  const supabase = createSupabaseBrowserClient();
  const [items, setItems] = useState<PendingPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('halal_places')
      .select('id, name, category, address, city, latitude, longitude, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setItems((data ?? []) as unknown as PendingPlace[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(id);
    const { error } = await supabase.from('halal_places').update({ status } as never).eq('id', id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(status === 'approved' ? 'Approved — it’s now visible to everyone.' : 'Rejected.');
    setItems((cur) => cur.filter((p) => p.id !== id));
  };

  if (loading) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No places waiting for review.</p>;

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <Card key={p.id}>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.address ?? p.city ?? 'No address'}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">{p.category}</Badge>
                <a
                  className="inline-flex items-center gap-1 text-xs text-primary underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="h-3 w-3" /> Check on the map
                </a>
              </div>
            </div>
            <Button size="sm" onClick={() => decide(p.id, 'approved')} disabled={busy === p.id}>
              <Check className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide(p.id, 'rejected')} disabled={busy === p.id}>
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
