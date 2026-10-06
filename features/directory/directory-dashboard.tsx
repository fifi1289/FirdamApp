'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Clock, Inbox, Loader2, Mail, Pencil, Phone, Plus, Store, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Business, BusinessCategory, BusinessEnquiry } from '@/types/database';
import { BUSINESS_CATEGORIES } from '@/features/directory/directory-config';
import { BUSINESSES_CHANGED, DirectoryList } from '@/features/directory/directory-list';
import { BusinessFormDialog } from '@/features/directory/business-form-dialog';

const ALL_CATEGORIES = Object.keys(BUSINESS_CATEGORIES) as BusinessCategory[];

function StatusBadge({ status }: { status: Business['status'] }) {
  if (status === 'approved')
    return (
      <Badge variant="outline" className="gap-1 border-brand-sage/30 bg-brand-sage/10 text-brand-sage">
        <BadgeCheck className="h-3 w-3" /> Live
      </Badge>
    );
  if (status === 'pending')
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" /> Awaiting review
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
      <XCircle className="h-3 w-3" /> Not approved
    </Badge>
  );
}

function MyBusinesses() {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const [listings, setListings] = useState<Business[]>([]);
  const [enquiries, setEnquiries] = useState<BusinessEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Business | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    const mine = data ?? [];
    setListings(mine);
    if (mine.length) {
      const { data: enq } = await supabase
        .from('business_enquiries')
        .select('*')
        .in(
          'business_id',
          mine.map((b) => b.id)
        )
        .order('created_at', { ascending: false });
      setEnquiries(enq ?? []);
    } else {
      setEnquiries([]);
    }
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    load();
    window.addEventListener(BUSINESSES_CHANGED, load);
    return () => window.removeEventListener(BUSINESSES_CHANGED, load);
  }, [load]);

  const setStatus = async (e: BusinessEnquiry, status: BusinessEnquiry['status']) => {
    setEnquiries((prev) => prev.map((x) => (x.id === e.id ? { ...x, status } : x)));
    const { error } = await supabase.from('business_enquiries').update({ status }).eq('id', e.id);
    if (error) {
      toast.error('Could not update enquiry');
      load();
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {listings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </span>
            <p className="mt-4 font-semibold text-foreground">Reach Muslim families with Firdam</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Listing is free. Approved businesses appear in Travel, Learning and the Directory,
              receive enquiries here, and can apply to become a featured Firdam Partner.
            </p>
            <Button size="sm" className="mt-5" onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> List your business
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {listings.map((b) => {
            const count = enquiries.filter((e) => e.business_id === b.id && e.status === 'new').length;
            return (
              <Card key={b.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{BUSINESS_CATEGORIES[b.category].label}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  {b.is_partner && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#7a5a30] dark:text-brand-gold">
                      <BadgeCheck className="h-3.5 w-3.5" /> Firdam Partner{b.featured ? ' · Featured' : ''}
                    </p>
                  )}
                  {b.admin_note && b.status !== 'approved' && (
                    <p className="mt-2 rounded-lg bg-muted p-2 text-xs text-muted-foreground">{b.admin_note}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {count > 0 ? `${count} new enquir${count === 1 ? 'y' : 'ies'}` : 'No new enquiries'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(b);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {listings.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Inbox className="h-4 w-4 text-primary" /> Enquiries from Firdam families
          </h2>
          {enquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enquiries yet. They’ll appear here as soon as families get in touch.</p>
          ) : (
            <div className="space-y-3">
              {enquiries.map((e) => (
                <Card key={e.id}>
                  <CardContent className="p-4 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {listings.find((b) => b.id === e.business_id)?.name} ·{' '}
                          {new Date(e.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {e.travel_date ? ` · travelling ${new Date(`${e.travel_date}T00:00:00`).toLocaleDateString()}` : ''}
                          {e.travellers ? ` · ${e.travellers} travellers` : ''}
                        </p>
                      </div>
                      <Select value={e.status} onValueChange={(v) => setStatus(e, v as BusinessEnquiry['status'])}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-foreground/90">{e.message}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {e.email}
                      </a>
                      {e.phone && (
                        <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" /> {e.phone}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <BusinessFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        business={editing}
        onSaved={() => window.dispatchEvent(new Event(BUSINESSES_CHANGED))}
      />
    </div>
  );
}

function MyEnquiries() {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const [rows, setRows] = useState<(BusinessEnquiry & { businessName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('business_enquiries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const list = data ?? [];
      const ids = Array.from(new Set(list.map((e) => e.business_id)));
      const { data: biz } = ids.length
        ? await supabase.from('businesses').select('id,name').in('id', ids)
        : { data: [] as { id: string; name: string }[] };
      const names = new Map((biz ?? []).map((b) => [b.id, b.name]));
      setRows(list.map((e) => ({ ...e, businessName: names.get(e.business_id) })));
      setLoading(false);
    })();
  }, [supabase, user]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }
  if (rows.length === 0) {
    return <p className="py-10 text-sm text-muted-foreground">You haven’t sent any enquiries yet.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((e) => (
        <Card key={e.id}>
          <CardContent className="p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground">{e.businessName ?? 'Business'}</p>
              <Badge variant="outline" className="capitalize">
                {e.status === 'new' ? 'Sent' : e.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(e.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="mt-2 whitespace-pre-line text-foreground/90">{e.message}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DirectoryDashboard() {
  const [tab, setTab] = useState('browse');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && ['browse', 'business', 'enquiries'].includes(t)) setTab(t);
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Directory"
        description="Trusted Muslim-friendly businesses: Hajj & Umrah operators, travel agencies, tutors, schools, caterers and Islamic finance."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="enquiries">My enquiries</TabsTrigger>
          <TabsTrigger value="business">For businesses</TabsTrigger>
        </TabsList>
        <TabsContent value="browse" className="mt-0">
          <DirectoryList categories={ALL_CATEGORIES} />
        </TabsContent>
        <TabsContent value="enquiries" className="mt-0">
          <MyEnquiries />
        </TabsContent>
        <TabsContent value="business" className="mt-0">
          <MyBusinesses />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
