'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, ImagePlus, Inbox, Loader2, MousePointerClick, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PARTNER_CATEGORIES, countryName, reachLabel, topicsFor, worksLabel, type PartnerShop } from '@/features/groceries/partners';
import { EMPTY_WHERE, PartnerWhereFields, cleanWhere, whereProblem, type PartnerWhere } from '@/features/partners/partner-where-fields';
import { FOUNDING_FREE_UNTIL } from '@/features/partners/partner-terms';
import type { Database, PartnerApplication, PartnerShopRow } from '@/types/database';

type Insert = Database['public']['Tables']['partner_shops']['Insert'];
type Counts = { last_30_days: number; total: number; families: number };

const BUCKET = 'partner-images';
const MAX_PHOTOS = 4;

const EMPTY: Insert = {
  name: '',
  department: 'clothing',
  description: '',
  city: '',
  ships: '',
  how_to_order: '',
  url: '',
  phone: '',
  image_url: null,
  photos: [],
  topics: [],
  discount_code: '',
  discount_text: '',
  free_until: FOUNDING_FREE_UNTIL,
  terms_accepted_at: null,
  active: true,
  position: 0,
};

/** The where-fields of a listing being edited (defaults for listings saved before countries existed). */
function whereOf(f: Partial<Insert>): PartnerWhere {
  return {
    country: f.country ?? EMPTY_WHERE.country,
    ships_mode: f.ships_mode ?? EMPTY_WHERE.ships_mode,
    ship_countries: f.ship_countries ?? [],
    exclude_countries: f.exclude_countries ?? [],
    works: f.works ?? null,
  };
}

/** Shrinks a photo to at most `max` px wide, as WebP (~50–80 KB). */
async function compress(file: File, max: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

const day = (iso: string) => new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

/** The proof a business applied and agreed itself: when, from which account, and which terms. */
function Consent({ a }: { a: PartnerApplication }) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none">
        {`Agreed ${day(a.created_at)} by ${a.account_email ?? a.email}`}
        {a.account_verified ? ' · verified account' : a.account_verified === false ? ' · account not verified' : ''}
        {a.terms_version ? ` · terms ${a.terms_version}` : ''}
      </summary>
      <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-3">
        {a.terms_text ? <pre className="whitespace-pre-wrap font-sans">{a.terms_text}</pre> : <p>Terms text not recorded (applied before Oct 29, 2026).</p>}
        {a.user_agent && <p>Device: {a.user_agent}</p>}
        {a.submitted_from && <p>Page: {a.submitted_from}</p>}
      </div>
    </details>
  );
}

/** Admin: add and edit partner shops, upload their logo and photos, see how many families Firdam sends them. */
export function PartnerAdmin() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [shops, setShops] = useState<PartnerShopRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [form, setForm] = useState<(Insert & { id?: string }) | null>(null);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [fromApplication, setFromApplication] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, { owner_name: string | null; email: string | null }>>({});
  const [contact, setContact] = useState({ owner_name: '', email: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [{ data, error }, { data: c }] = await Promise.all([
      supabase.from('partner_shops').select('*').order('department').order('position').order('name'),
      supabase.rpc('partner_click_counts'),
    ]);
    if (error) {
      toast.error('Could not load partner shops', { description: error.message });
      setShops([]);
      return;
    }
    setShops(data ?? []);
    setCounts(Object.fromEntries((c ?? []).map((r) => [r.partner_id, r])));
    const { data: apps } = await supabase.from('partner_applications').select('*').order('created_at', { ascending: false }).limit(100);
    setApplications(apps ?? []);
    // Private contact details (admins only); empty if the table isn't there yet.
    const { data: cs } = await supabase.from('partner_contacts').select('partner_id, owner_name, email');
    setContacts(Object.fromEntries((cs ?? []).map((c) => [c.partner_id, { owner_name: c.owner_name, email: c.email }])));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Insert>(key: K, value: Insert[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const upload = async (file: File, kind: 'logo' | 'photo') => {
    const blob = await compress(file, kind === 'logo' ? 400 : 900);
    const ext = blob.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const slug = (form?.name || 'shop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'shop';
    const path = `${slug}/${kind}-${Date.now().toString(36)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || file.type, cacheControl: '31536000' });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  const onLogo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy('logo');
    try {
      set('image_url', await upload(file, 'logo'));
    } catch (e) {
      toast.error('Logo upload failed', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  const onPhotos = async (files: FileList | null) => {
    if (!files?.length || !form) return;
    const room = MAX_PHOTOS - (form.photos?.length ?? 0);
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (!list.length) return toast.error(`Up to ${MAX_PHOTOS} photos per shop.`);
    setBusy('photos');
    try {
      const urls: string[] = [];
      for (const f of list) urls.push(await upload(f, 'photo'));
      setForm((f) => (f ? { ...f, photos: [...(f.photos ?? []), ...urls] } : f));
    } catch (e) {
      toast.error('Photo upload failed', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
      if (photoRef.current) photoRef.current.value = '';
    }
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return toast.error('Add the shop name.');
    if (!/^https:\/\//.test(form.url.trim())) return toast.error('The link must start with https://');
    const whereIssue = whereProblem(whereOf(form), form.department);
    if (whereIssue) return toast.error(whereIssue);
    setBusy('save');
    const row: Insert = {
      name: form.name.trim(),
      department: form.department,
      description: blank(form.description),
      city: blank(form.city),
      ships: blank(form.ships),
      how_to_order: blank(form.how_to_order),
      url: form.url.trim(),
      image_url: form.image_url ?? null,
      photos: form.photos ?? [],
      topics: topicsFor(form.department).length ? form.topics ?? [] : [],
      phone: blank(form.phone ?? ''),
      discount_code: blank(form.discount_code)?.toUpperCase() ?? null,
      discount_text: blank(form.discount_text),
      free_until: form.free_until || null,
      terms_accepted_at: form.terms_accepted_at ?? null,
      active: form.active ?? true,
      position: Number(form.position) || 0,
      ...cleanWhere(whereOf(form), form.department),
      ...(!form.id && fromApplication ? { application_id: fromApplication } : {}),
    };
    const { data: saved, error } = form.id
      ? await supabase.from('partner_shops').update(row).eq('id', form.id).select('id').single()
      : await supabase.from('partner_shops').insert(row).select('id').single();
    setBusy(null);
    if (error) return toast.error('Save failed', { description: error.message });
    if (saved && (contact.email.trim() || contact.owner_name.trim())) {
      const { error: cErr } = await supabase.from('partner_contacts').upsert({
        partner_id: saved.id,
        owner_name: blank(contact.owner_name),
        email: blank(contact.email)?.toLowerCase() ?? null,
        phone: blank(form.phone ?? ''),
        updated_at: new Date().toISOString(),
      });
      if (cErr) toast.error('Contact email not saved', { description: cErr.message });
    }
    toast.success(form.id ? 'Partner updated' : 'Partner added');
    if (!form.id && fromApplication) {
      await supabase.from('partner_applications').update({ status: 'added' }).eq('id', fromApplication);
      setFromApplication(null);
    }
    setForm(null);
    load();
  };

  const toggle = async (s: PartnerShopRow, active: boolean) => {
    setShops((prev) => prev?.map((x) => (x.id === s.id ? { ...x, active } : x)) ?? prev);
    const { error } = await supabase.from('partner_shops').update({ active }).eq('id', s.id);
    if (error) {
      toast.error('Update failed', { description: error.message });
      load();
    }
  };

  const remove = async (s: PartnerShopRow) => {
    if (!window.confirm(`Remove ${s.name} from Firdam? Their click history is deleted too.`)) return;
    const { error } = await supabase.from('partner_shops').delete().eq('id', s.id);
    if (error) return toast.error('Remove failed', { description: error.message });
    load();
  };

  const dept = (id: string) => PARTNER_CATEGORIES.find((d) => d.id === id)?.label ?? id;

  const setStatus = async (a: PartnerApplication, status: PartnerApplication['status']) => {
    setApplications((prev) => prev.map((x) => (x.id === a.id ? { ...x, status } : x)));
    const { error } = await supabase.from('partner_applications').update({ status }).eq('id', a.id);
    if (error) {
      toast.error('Update failed', { description: error.message });
      load();
    }
  };

  /** Starts a listing from an application; the shop still needs a logo and the switches checked. */
  const createFrom = (a: PartnerApplication) => {
    setFromApplication(a.id);
    setForm({
      ...EMPTY,
      name: a.shop_name,
      department: a.department,
      description: a.description ?? '',
      city: a.city ?? '',
      ships: a.ships ?? '',
      phone: a.phone ?? '',
      url: a.link.replace(/^http:\/\//i, 'https://'),
      how_to_order: a.how_to_order ?? '',
      image_url: a.logo_url ?? null,
      photos: a.photos ?? [],
      topics: a.topics ?? [],
      discount_code: a.discount_code ?? '',
      discount_text: a.discount_text ?? '',
      terms_accepted_at: a.terms_agreed ? a.created_at : null,
      active: false,
      ...(a.country
        ? {
            country: a.country,
            ships_mode: a.ships_mode ?? 'country',
            ship_countries: a.ship_countries ?? [],
            exclude_countries: a.exclude_countries ?? [],
            works: a.works ?? null,
          }
        : {}),
    });
    setContact({ owner_name: a.owner_name, email: a.email });
    // Bring the filled-in form into view (it sits below the applications).
    setTimeout(() => document.getElementById('partner-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const open = applications.filter((a) => a.status === 'new' || a.status === 'contacted');

  if (shops === null) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading partner shops…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Muslim-owned shops shown in Shopping. Only add a shop after the owner has replied “I agree” to the partner terms.
        </p>
        {!form && (
          <Button size="sm" onClick={() => {
              setFromApplication(null);
              setContact({ owner_name: '', email: '' });
              setForm({ ...EMPTY });
            }}>
            <Plus className="mr-2 h-4 w-4" /> Add partner
          </Button>
        )}
      </div>

      {open.length > 0 && (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <Inbox className="h-4 w-4 text-primary" /> {`Applications (${open.length})`}
            </p>
            {open.map((a) => (
              <div key={a.id} className="space-y-2 rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{a.shop_name}</p>
                  <Badge variant="secondary">{dept(a.department)}</Badge>
                  {a.status === 'contacted' && <Badge variant="outline">Contacted</Badge>}
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}</span>
                </div>
                <p className="text-muted-foreground">
                  {a.owner_name} · <a className="text-primary hover:underline" href={`mailto:${a.email}`}>{a.email}</a>
                  {a.phone ? ` · ${a.phone}` : ''}
                  {a.city ? ` · ${a.city}` : ''}
                </p>
                <Consent a={a} />
                {a.description && <p className="text-foreground">{a.description}</p>}
                {a.country && (
                  <p className="text-muted-foreground">
                    {[reachLabel({ ...a, name: a.shop_name, country: a.country } as unknown as PartnerShop), worksLabel(a.works)].filter(Boolean).join(' · ')}
                  </p>
                )}
                {a.ships && <p className="text-muted-foreground">{a.ships}</p>}
                {a.how_to_order && <p className="text-muted-foreground">{a.how_to_order}</p>}
                {a.discount_code && (
                  <p className="text-foreground">
                    <span className="font-mono font-semibold">{a.discount_code}</span>
                    {a.discount_text ? ` · ${a.discount_text}` : ''}
                  </p>
                )}
                {(a.topics ?? []).length > 0 && <p className="text-muted-foreground">{a.topics.join(' · ')}</p>}
                {(a.logo_url || (a.photos ?? []).length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {a.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.logo_url} alt="Logo" className="h-16 w-16 rounded-full border border-border object-cover" />
                    )}
                    {(a.photos ?? []).map((src) => (
                      <a key={src} href={src} target="_blank" rel="noopener noreferrer" title="Open full size to check for faces">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <a href={a.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                    Open their link <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button size="sm" onClick={() => createFrom(a)}>Create listing</Button>
                  {a.status === 'new' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(a, 'contacted')}>Mark contacted</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setStatus(a, 'declined')}>Decline</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {form && (
        <Card id="partner-form" className="scroll-mt-24">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{form.id ? `Edit ${form.name}` : 'New partner shop'}</h3>
              <Button variant="ghost" size="sm" onClick={() => setForm(null)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                Shop name
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={80} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Department
                <select
                  value={form.department}
                  onChange={(e) => set('department', e.target.value as Insert['department'])}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PARTNER_CATEGORIES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                Description
                <Textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} maxLength={300} rows={2} />
              </label>
              {topicsFor(form.department).length > 0 && (
                <div className="space-y-1.5 text-sm font-medium sm:col-span-2">
                  {form.department === 'learning' ? 'What they teach (up to 6)' : 'What they offer (up to 6)'}
                  <div className="flex flex-wrap gap-2">
                    {topicsFor(form.department).map((t) => {
                      const on = (form.topics ?? []).includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            set('topics', on ? (form.topics ?? []).filter((x) => x !== t) : [...(form.topics ?? []), t].slice(0, 6))
                          }
                          className={`rounded-full px-3 py-1 text-sm ${on ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <label className="space-y-1 text-sm font-medium">
                City
                <Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} placeholder="Hamilton, ON" maxLength={80} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Shipping
                <Input value={form.ships ?? ''} onChange={(e) => set('ships', e.target.value)} placeholder="Free shipping over $80 (fees apply)" maxLength={120} />
              </label>
              <PartnerWhereFields value={whereOf(form)} department={form.department} onChange={(w) => setForm({ ...form, ...w })} />
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                How to order
                <Input
                  value={form.how_to_order ?? ''}
                  onChange={(e) => set('how_to_order', e.target.value)}
                  placeholder="Message on Facebook to order. Pre-orders take 3–4 weeks. Pay by Interac e-Transfer."
                  maxLength={200}
                />
              </label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                Link (website, Facebook, Instagram or WhatsApp)
                <Input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Owner’s name (private)
                <Input value={contact.owner_name} onChange={(e) => setContact((c) => ({ ...c, owner_name: e.target.value }))} maxLength={80} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Contact email (private, for monthly reports)
                <Input type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} maxLength={254} />
              </label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                Phone (optional, shows a Call button)
                <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="613-262-8640" maxLength={30} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Discount code (optional)
                <Input value={form.discount_code ?? ''} onChange={(e) => set('discount_code', e.target.value)} placeholder="FIRDAM10" maxLength={30} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                What the code gives
                <Input value={form.discount_text ?? ''} onChange={(e) => set('discount_text', e.target.value)} placeholder="10% off your first order" maxLength={80} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Free until
                <Input type="date" value={form.free_until ?? ''} onChange={(e) => set('free_until', e.target.value || null)} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Order (lower shows first)
                <Input type="number" value={form.position ?? 0} onChange={(e) => set('position', Number(e.target.value))} />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Logo</p>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-muted" />
                )}
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => onLogo(e.target.files)} />
                <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={busy === 'logo'}>
                  {busy === 'logo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                  {form.image_url ? 'Change logo' : 'Upload logo'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{`Product photos (up to ${MAX_PHOTOS})`}</p>
              <div className="flex flex-wrap items-center gap-2">
                {(form.photos ?? []).map((src) => (
                  <div key={src} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => set('photos', (form.photos ?? []).filter((p) => p !== src))}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {(form.photos?.length ?? 0) < MAX_PHOTOS && (
                  <>
                    <input ref={photoRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
                    <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()} disabled={busy === 'photos'}>
                      {busy === 'photos' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                      Add photos
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">The owner agreed to the partner terms</span>
                  <span className="block text-xs text-muted-foreground">Keep a screenshot of their “I agree” message.</span>
                </span>
                <Switch
                  checked={!!form.terms_accepted_at}
                  onCheckedChange={(on) => set('terms_accepted_at', on ? form.terms_accepted_at ?? new Date().toISOString() : null)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">Show in Shopping</span>
                <Switch checked={form.active ?? true} onCheckedChange={(on) => set('active', on)} />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy === 'save' || !!(form.active && !form.terms_accepted_at)}>
                {busy === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
            {form.active && !form.terms_accepted_at && (
              <p className="text-right text-xs text-muted-foreground">To show this shop, first confirm the owner agreed to the terms (or turn off “Show in Shopping”).</p>
            )}
          </CardContent>
        </Card>
      )}

      {shops.length === 0 && !form ? (
        <p className="py-8 text-sm text-muted-foreground">No partner shops yet.</p>
      ) : (
        shops.map((s) => {
          const c = counts[s.id];
          return (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                {s.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" className="h-12 w-12 rounded-full border border-border object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <Badge variant="secondary">{dept(s.department)}</Badge>
                    {!s.active && <Badge variant="outline">Hidden</Badge>}
                    {!s.terms_accepted_at && <Badge variant="destructive">Terms not confirmed</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.free_until ? `Free until ${new Date(`${s.free_until}T12:00:00`).toLocaleDateString('en-CA', { dateStyle: 'medium' })}` : 'No end date'}
                    {s.terms_accepted_at ? ` · Agreed ${new Date(s.terms_accepted_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}` : ''}
                    {contacts[s.id]?.email ? ` · ${contacts[s.id]!.email}` : ''}
                  </p>
                  {s.country && (
                    <p className="text-xs text-muted-foreground">
                      {countryName(s.country)} · {[reachLabel(s as unknown as PartnerShop), worksLabel(s.works)].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {(() => {
                    const app = s.application_id ? applications.find((x) => x.id === s.application_id) : undefined;
                    if (app) return <Consent a={app} />;
                    return s.terms_accepted_at ? <p className="text-xs text-muted-foreground">Agreed by message, keep your screenshot</p> : null;
                  })()}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-foreground" title="Taps on “Visit shop” from Firdam">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{c?.last_30_days ?? 0}</span>
                  <span className="text-muted-foreground">last 30 days ·</span>
                  <span className="font-semibold">{c?.total ?? 0}</span>
                  <span className="text-muted-foreground">all time ·</span>
                  <span className="font-semibold">{c?.families ?? 0}</span>
                  <span className="text-muted-foreground">families</span>
                </div>
                <Switch checked={s.active} onCheckedChange={(on) => toggle(s, on)} aria-label={`Show ${s.name}`} disabled={!s.terms_accepted_at && !s.active} />
                <Button variant="ghost" size="sm" onClick={() => {
                    setFromApplication(null);
                    setContact({ owner_name: contacts[s.id]?.owner_name ?? '', email: contacts[s.id]?.email ?? '' });
                    setForm({ ...s });
                  }} aria-label={`Edit ${s.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(s)} aria-label={`Remove ${s.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
