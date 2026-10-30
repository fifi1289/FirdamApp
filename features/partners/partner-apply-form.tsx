'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PARTNER_CATEGORIES, topicsFor } from '@/features/groceries/partners';
import { usePartnerCountry } from '@/features/partners/partner-country';
import { EMPTY_WHERE, PartnerWhereFields, cleanWhere, whereProblem, type PartnerWhere } from '@/features/partners/partner-where-fields';
import { PARTNER_TERMS_VERSION, partnerTermsText } from '@/features/partners/partner-terms';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { tr, trn } from '@/lib/i18n';

type Insert = Database['public']['Tables']['partner_applications']['Insert'];

const BUCKET = 'partner-uploads';
const MAX_PHOTOS = 4;

const EMPTY = {
  shop_name: '',
  owner_name: '',
  email: '',
  phone: '',
  department: 'clothing' as Insert['department'],
  city: '',
  link: '',
  description: '',
  ships: '',
  how_to_order: '',
  discount_code: '',
  discount_text: '',
  website: '', // honeypot: people never see it, bots fill it in
};

const blank = (v: string) => (v.trim() ? v.trim() : null);

/** Shrinks a picture before upload (WebP, at most `max` px wide). */
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

/**
 * "Become a partner": the business fills in its whole listing (logo, photos,
 * discount, how to order). Needs a free Firdam account so uploads belong to
 * someone. The admin reviews it in Admin → Partner shops and creates the listing in one click.
 */
export function PartnerApplyForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user, loading } = useAuth();
  const [f, setF] = useState(EMPTY);
  const [topics, setTopics] = useState<string[]>([]);
  const { home } = usePartnerCountry();
  const [where, setWhere] = useState<PartnerWhere | null>(null);
  const whereValue = where ?? { ...EMPTY_WHERE, country: home ?? EMPTY_WHERE.country };
  const [logo, setLogo] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState<'logo' | 'photos' | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // Start from the account's email; they can change it to a business email.
  useEffect(() => {
    if (user?.email) setF((prev) => (prev.email ? prev : { ...prev, email: user.email ?? '' }));
  }, [user]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF((prev) => ({ ...prev, [key]: e.target.value }));
    setProblem(null);
  };

  const options = topicsFor(f.department);

  const upload = async (file: File, kind: 'logo' | 'photo'): Promise<string> => {
    if (!user) throw new Error('Sign in first.');
    const blob = await compress(file, kind === 'logo' ? 500 : 1000);
    const ext = blob.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const path = `${user.id}/${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || file.type, cacheControl: '31536000' });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  const onLogo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading('logo');
    setProblem(null);
    try {
      setLogo(await upload(file, 'logo'));
    } catch {
      setProblem(tr('Your logo couldn’t be uploaded. Use a JPG, PNG or WebP under 3 MB.'));
    } finally {
      setUploading(null);
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  const onPhotos = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((x) => x.type.startsWith('image/')).slice(0, MAX_PHOTOS - photos.length);
    if (!list.length) return;
    setUploading('photos');
    setProblem(null);
    try {
      const urls: string[] = [];
      for (const file of list) urls.push(await upload(file, 'photo'));
      setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      setProblem(tr('A photo couldn’t be uploaded. Use JPG, PNG or WebP under 3 MB.'));
    } finally {
      setUploading(null);
      if (photoRef.current) photoRef.current.value = '';
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.website) return setDone(true);
    if (!f.shop_name.trim() || !f.owner_name.trim()) return setProblem(tr('Add your business name and your name.'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setProblem(tr('Enter a valid email address.'));
    let link = f.link.trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
    if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(link)) return setProblem(tr('Add a link to your business: website, Facebook, Instagram or WhatsApp.'));
    if (!f.description.trim()) return setProblem(tr('Tell families about your business in a sentence or two.'));
    if (!logo) return setProblem(tr('Upload your logo.'));
    if (!f.discount_code.trim() || !f.discount_text.trim()) return setProblem(tr('Add your Firdam discount code and what it gives (for example 10% off).'));
    if (options.length && !topics.length) return setProblem(tr('Choose what you offer.'));
    const whereIssue = whereProblem(whereValue, f.department);
    if (whereIssue) return setProblem(whereIssue);
    if (!agreed) return setProblem(tr('Please read and agree to the partner terms.'));

    setBusy(true);
    const row: Insert = {
      shop_name: f.shop_name.trim(),
      owner_name: f.owner_name.trim(),
      email: f.email.trim().toLowerCase(),
      phone: blank(f.phone),
      department: f.department,
      city: blank(f.city),
      link,
      description: blank(f.description),
      ships: blank(f.ships),
      how_to_order: blank(f.how_to_order),
      discount_code: f.discount_code.trim().toUpperCase(),
      discount_text: f.discount_text.trim(),
      logo_url: logo,
      photos,
      topics: options.length ? topics : [],
      ...cleanWhere(whereValue, f.department),
      terms_agreed: true,
      // A record of exactly what they agreed to, and from where.
      terms_version: PARTNER_TERMS_VERSION,
      terms_text: partnerTermsText(),
      user_agent: navigator.userAgent.slice(0, 400),
      submitted_from: window.location.href.slice(0, 300),
    };
    const { error } = await supabase.from('partner_applications').insert(row);
    setBusy(false);
    if (error) {
      setProblem(error.message.includes('Too many') ? error.message : tr('Something went wrong. Please try again, or email us.'));
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-semibold text-foreground">{tr('JazakAllahu khayran! Your application is in.')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tr('We’ll review it and email you a preview of your listing within a few days, insha’Allah.')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {tr('Loading…')}
      </p>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <p className="font-semibold text-foreground">{tr('Sign in to apply')}</p>
        <p className="text-sm text-muted-foreground">
          {tr('Applying takes a free Firdam account, so you can upload your logo and photos safely. It takes a minute.')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/auth/register">{tr('Create a free account')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/login?redirect=%2Fpartners%23apply">{tr('I have an account')}</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{tr('After creating your account, sign in and come back to firdam.com/partners.')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6" noValidate>
      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-foreground">{tr('About you')}</legend>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('Business name *')}
          <Input value={f.shop_name} onChange={set('shop_name')} maxLength={80} autoComplete="organization" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('Your name *')}
          <Input value={f.owner_name} onChange={set('owner_name')} maxLength={80} autoComplete="name" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('Email *')}
          <Input type="email" value={f.email} onChange={set('email')} maxLength={254} autoComplete="email" />
          <span className="block text-xs font-normal text-muted-foreground">{tr('We send your preview and monthly numbers here.')}</span>
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('Phone or WhatsApp')}
          <Input type="tel" value={f.phone} onChange={set('phone')} maxLength={30} autoComplete="tel" />
          <span className="block text-xs font-normal text-muted-foreground">{tr('Shown as a Call button for services.')}</span>
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-foreground">{tr('Your listing')}</legend>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('What do you offer? *')}
          <select
            value={f.department}
            onChange={(e) => {
              set('department')(e);
              setTopics([]);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {PARTNER_CATEGORIES.map((d) => (
              <option key={d.id} value={d.id}>
                {tr(d.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('City or area')}
          <Input value={f.city} onChange={set('city')} maxLength={80} placeholder={tr('Ottawa, ON or Online only')} />
        </label>

        {options.length > 0 && (
          <div className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
            {f.department === 'learning' ? tr('What do you teach? *') : tr('What services do you offer? *')}
            <div className="flex flex-wrap gap-2">
              {options.map((t) => {
                const on = topics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTopics(on ? topics.filter((x) => x !== t) : [...topics, t].slice(0, 6))}
                    className={`rounded-full px-3 py-1 text-sm ${on ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                  >
                    {trn(t)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <PartnerWhereFields value={whereValue} department={f.department} onChange={setWhere} />

        <label className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
          {tr('Link to your business *')}
          <Input value={f.link} onChange={set('link')} maxLength={300} placeholder={tr('Website, Facebook, Instagram or WhatsApp link')} />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
          {tr('Tell families about your business *')}
          <Textarea value={f.description} onChange={set('description')} maxLength={300} rows={3} placeholder={tr('What you offer and what makes it special, in one or two sentences.')} />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('Delivery details (optional)')}
          <Input value={f.ships} onChange={set('ships')} maxLength={120} placeholder={tr('Free shipping over $80 · Extra fee outside Ontario')} />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('How to order or book')}
          <Input value={f.how_to_order} onChange={set('how_to_order')} maxLength={200} placeholder={tr('Order on our website · Message us on Instagram')} />
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold text-foreground">{tr('Firdam discount *')}</legend>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          {tr('Every partner offers Firdam families an ongoing discount. You choose the amount. If you take orders by message, customers will just mention the code.')}
        </p>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('Code')}
          <Input value={f.discount_code} onChange={set('discount_code')} maxLength={30} placeholder={tr('FIRDAM10')} className="uppercase" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {tr('What it gives')}
          <Input value={f.discount_text} onChange={set('discount_text')} maxLength={80} placeholder={tr('10% off full-price items')} />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold text-foreground">{tr('Logo and photos')}</legend>
        <div className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={tr('Your logo')} className="h-16 w-16 rounded-full border border-border object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted" />
          )}
          <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onLogo(e.target.files)} />
          <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={uploading === 'logo'}>
            {uploading === 'logo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {logo ? tr('Change logo') : tr('Upload your logo *')}
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {tr('Up to {0} photos of your best products or work. Firdam is a family app, so please use photos without faces (products, mannequins or work you’ve done). We’ll crop any faces.', [MAX_PHOTOS])}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {photos.map((src) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  aria-label={tr('Remove photo')}
                  onClick={() => setPhotos(photos.filter((p) => p !== src))}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <>
                <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
                <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()} disabled={uploading === 'photos'}>
                  {uploading === 'photos' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                  {tr('Add photos')}
                </Button>
              </>
            )}
          </div>
        </div>
      </fieldset>

      <label className="hidden" aria-hidden="true">
        {tr('Website')}
        <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
      </label>

      <label className="flex items-start gap-3 text-sm text-foreground">
        <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
        <span>
          {tr('I own or run this business and agree to the')}{' '}
          <a href="#terms" className="font-medium text-primary underline-offset-2 hover:underline">
            {tr('partner terms')}
          </a>{' '}
          {tr('above.')}
        </span>
      </label>

      {problem && <p className="text-sm text-destructive">{trn(problem)}</p>}

      <Button type="submit" disabled={busy || uploading !== null} className="w-full sm:w-auto">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {tr('Send my application')}
      </Button>
      <p className="text-xs text-muted-foreground">{tr('We use these details only to set up your listing and contact you about it. See our privacy policy.')}</p>
    </form>
  );
}
