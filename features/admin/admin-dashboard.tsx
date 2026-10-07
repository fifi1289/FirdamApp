'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Check, Loader2, ShieldAlert, Star, X } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Business, Database } from '@/types/database';
import { BUSINESS_CATEGORIES } from '@/features/directory/directory-config';
import { CommunityModeration } from '@/features/community/community-moderation';
import { RecipePhotos } from '@/features/admin/recipe-photos';
import { RecipePhotoUpload } from '@/features/admin/recipe-photo-upload';

export function AdminDashboard() {
  const supabase = createSupabaseBrowserClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [enquiryCounts, setEnquiryCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [{ data: biz }, { data: enq }] = await Promise.all([
      supabase.from('businesses').select('*').order('created_at', { ascending: false }),
      supabase.from('business_enquiries').select('business_id'),
    ]);
    setBusinesses(biz ?? []);
    const counts: Record<string, number> = {};
    for (const e of enq ?? []) counts[e.business_id] = (counts[e.business_id] ?? 0) + 1;
    setEnquiryCounts(counts);
  }, [supabase]);

  useEffect(() => {
    supabase.rpc('is_admin').then(({ data, error }) => {
      const ok = !error && data === true;
      setIsAdmin(ok);
      if (ok) load();
    });
  }, [supabase, load]);

  const update = async (b: Business, patch: Database['public']['Tables']['businesses']['Update']) => {
    setBusinesses((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('businesses').update(patch).eq('id', b.id);
    if (error) {
      toast.error('Update failed', { description: error.message });
      load();
    }
  };

  if (isAdmin === null) {
    return (
      <AppShell>
        <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
        </p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-md border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">Admins only</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your user id to the <code>app_admins</code> table in Supabase to manage Firdam.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const pending = businesses.filter((b) => b.status === 'pending');
  const approved = businesses.filter((b) => b.status === 'approved');
  const totalEnquiries = Object.values(enquiryCounts).reduce((a, b) => a + b, 0);

  const Row = ({ b, review }: { b: Business; review?: boolean }) => (
    <Card>
      <CardContent className="space-y-3 p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground">{b.name}</p>
            <p className="text-xs text-muted-foreground">
              {BUSINESS_CATEGORIES[b.category].label}
              {b.city ? ` · ${b.city}` : ''}
              {b.country ? `, ${b.country}` : ''} · {enquiryCounts[b.id] ?? 0} enquiries
            </p>
          </div>
          <div className="flex gap-1.5">
            {b.is_partner && (
              <Badge className="gap-1 bg-brand-gold text-brand-espresso hover:bg-brand-gold">
                <BadgeCheck className="h-3 w-3" /> Partner
              </Badge>
            )}
            {b.featured && <Badge variant="secondary">Featured</Badge>}
          </div>
        </div>
        {b.description && <p className="line-clamp-3 text-muted-foreground">{b.description}</p>}
        <p className="text-xs text-muted-foreground">
          {[b.email, b.phone, b.website, b.licence_number && `Licence ${b.licence_number}`].filter(Boolean).join(' · ')}
        </p>
        {review ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={notes[b.id] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [b.id]: e.target.value }))}
              placeholder="Note to the business (shown if rejected)"
              className="h-9"
            />
            <Button size="sm" className="h-9" onClick={() => update(b, { status: 'approved', admin_note: notes[b.id] || null })}>
              <Check className="mr-1.5 h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => update(b, { status: 'rejected', admin_note: notes[b.id] || 'Not approved' })}
            >
              <X className="mr-1.5 h-4 w-4" /> Reject
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={b.is_partner} onCheckedChange={(v) => update(b, { is_partner: v })} />
              Firdam Partner
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={b.featured} onCheckedChange={(v) => update(b, { featured: v })} />
              <Star className="h-3.5 w-3.5" /> Featured
            </label>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => update(b, { status: 'pending' })}>
              Move back to review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AppShell>
      <PageHeader title="Admin" description="Review business listings, manage partners and moderate the community." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Awaiting review', value: pending.length },
          { label: 'Live listings', value: approved.length },
          { label: 'Partners', value: approved.filter((b) => b.is_partner).length },
          { label: 'Enquiries sent', value: totalEnquiries },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Tabs defaultValue="review">
        <TabsList className="mb-4">
          <TabsTrigger value="review">Review ({pending.length})</TabsTrigger>
          <TabsTrigger value="live">Live listings</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="photos">Recipe photos</TabsTrigger>
        </TabsList>
        <TabsContent value="review" className="mt-0 space-y-3">
          {pending.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">Nothing waiting for review.</p>
          ) : (
            pending.map((b) => <Row key={b.id} b={b} review />)
          )}
        </TabsContent>
        <TabsContent value="live" className="mt-0 space-y-3">
          {approved.map((b) => (
            <Row key={b.id} b={b} />
          ))}
        </TabsContent>
        <TabsContent value="photos" className="mt-0 space-y-5">
          <RecipePhotoUpload />
          <RecipePhotos />
        </TabsContent>
        <TabsContent value="community" className="mt-0">
          <CommunityModeration />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
