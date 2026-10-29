'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PARTNER_CATEGORIES } from '@/features/groceries/partners';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Insert = Database['public']['Tables']['partner_applications']['Insert'];

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
  website: '', // honeypot: people never see it, bots fill it in
};

const blank = (v: string) => (v.trim() ? v.trim() : null);

/** Public "Become a partner" form. Saves an application the admin sees in Admin → Partner shops. */
export function PartnerApplyForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [f, setF] = useState(EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF((prev) => ({ ...prev, [key]: e.target.value }));
    setProblem(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.website) return setDone(true);
    if (!f.shop_name.trim() || !f.owner_name.trim()) return setProblem('Add your shop name and your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setProblem('Enter a valid email address.');
    let link = f.link.trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
    if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(link)) return setProblem('Add a link to your shop: website, Facebook, Instagram or WhatsApp.');
    if (!agreed) return setProblem('Please read and agree to the partner terms.');

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
      terms_agreed: true,
    };
    const { error } = await supabase.from('partner_applications').insert(row);
    setBusy(false);
    if (error) {
      setProblem(error.message.includes('Too many') ? error.message : 'Something went wrong. Please try again, or email us.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-semibold text-foreground">JazakAllahu khayran! Your application is in.</p>
        <p className="mt-1 text-sm text-muted-foreground">We’ll message you within a few days to set up your shop on Firdam.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          Business name *
          <Input value={f.shop_name} onChange={set('shop_name')} maxLength={80} autoComplete="organization" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          Your name *
          <Input value={f.owner_name} onChange={set('owner_name')} maxLength={80} autoComplete="name" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          Email *
          <Input type="email" value={f.email} onChange={set('email')} maxLength={254} autoComplete="email" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          Phone or WhatsApp
          <Input type="tel" value={f.phone} onChange={set('phone')} maxLength={30} autoComplete="tel" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          What do you offer? *
          <select
            value={f.department}
            onChange={set('department')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {PARTNER_CATEGORIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          City
          <Input value={f.city} onChange={set('city')} maxLength={80} placeholder="Ottawa, ON" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
          Link to your business *
          <Input value={f.link} onChange={set('link')} maxLength={300} placeholder="Website, Facebook, Instagram or WhatsApp link" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
          Shipping, delivery, class format or area served
          <Input value={f.ships} onChange={set('ships')} maxLength={120} placeholder="e.g. Ships across Canada, Online classes, or Serves Ottawa & area" />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
          Tell families about your shop
          <Textarea value={f.description} onChange={set('description')} maxLength={500} rows={3} placeholder="What you sell, what makes it special, how people order and pay." />
        </label>
        <label className="hidden" aria-hidden="true">
          Website
          <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
        </label>
      </div>

      <label className="flex items-start gap-3 text-sm text-foreground">
        <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
        <span>
          I own or run this shop and agree to the <a href="#terms" className="font-medium text-primary underline-offset-2 hover:underline">partner terms</a> above.
        </span>
      </label>

      {problem && <p className="text-sm text-destructive">{problem}</p>}

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send my application
      </Button>
      <p className="text-xs text-muted-foreground">We only use these details to contact you about your listing. See our privacy policy.</p>
    </form>
  );
}
