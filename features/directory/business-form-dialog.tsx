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
import { cn } from '@/lib/utils';
import type { Business, BusinessCategory } from '@/types/database';
import { BUSINESS_CATEGORIES, SERVICE_SUGGESTIONS } from '@/features/directory/directory-config';

interface GeoResult {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
}

export function BusinessFormDialog({
  open,
  onOpenChange,
  business,
  defaultCategory = 'hajj_umrah',
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  business?: Business | null;
  defaultCategory?: BusinessCategory;
  onSaved: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>(defaultCategory);
  const [description, setDescription] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState('');
  const [address, setAddress] = useState('');
  const [point, setPoint] = useState<{ latitude: number; longitude: number; city: string | null; country: string | null } | null>(null);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [finding, setFinding] = useState(false);
  const [online, setOnline] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [licence, setLicence] = useState('');
  const [languages, setLanguages] = useState('');
  const [offer, setOffer] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(business?.name ?? '');
    setCategory(business?.category ?? defaultCategory);
    setDescription(business?.description ?? '');
    setServices(business?.services ?? []);
    setAddress(business?.address ?? '');
    setPoint(
      business?.latitude != null && business?.longitude != null
        ? { latitude: business.latitude, longitude: business.longitude, city: business.city, country: business.country }
        : null
    );
    setResults([]);
    setOnline(business?.serves_online ?? false);
    setPhone(business?.phone ?? '');
    setEmail(business?.email ?? '');
    setWebsite(business?.website ?? '');
    setLicence(business?.licence_number ?? '');
    setLanguages((business?.languages ?? []).join(', '));
    setOffer(business?.partner_offer ?? '');
  }, [open, business, defaultCategory]);

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

  const toggleService = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const save = async () => {
    if (name.trim().length < 2) return toast.error('Enter the business name.');
    if (!email.trim() && !phone.trim() && !website.trim())
      return toast.error('Add at least one way for families to contact you.');
    if (!point && !online) return toast.error('Set your location, or mark that you serve customers online.');
    const row = {
      name: name.trim(),
      category,
      description: description.trim() || null,
      services,
      address: address.trim() || null,
      city: point?.city ?? null,
      country: point?.country ?? null,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
      serves_online: online,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      licence_number: licence.trim() || null,
      languages: languages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
      partner_offer: offer.trim() || null,
    };
    setSaving(true);
    const { error } = business
      ? await supabase.from('businesses').update(row).eq('id', business.id)
      : await supabase.from('businesses').insert(row);
    setSaving(false);
    if (error) {
      toast.error('Could not save your listing', { description: error.message });
      return;
    }
    toast.success(
      business ? 'Listing updated' : 'Thank you! Your listing has been submitted for review.',
      business ? undefined : { description: 'We usually review new businesses within 2 working days.' }
    );
    onSaved();
    onOpenChange(false);
  };

  const suggestions = SERVICE_SUGGESTIONS[category] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{business ? 'Edit your listing' : 'List your business on Firdam'}</DialogTitle>
          <DialogDescription>
            Reach Muslim families looking for trusted travel agencies, Umrah operators, tutors,
            caterers and more. Listings are reviewed before they appear.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Business name</Label>
              <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as BusinessCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BUSINESS_CATEGORIES) as BusinessCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {BUSINESS_CATEGORIES[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b-desc">About your business</Label>
            <Textarea
              id="b-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What you offer, who you serve, what makes you trustworthy"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Services</Label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...suggestions, ...services])).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    services.includes(s)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="Add another service"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customService.trim()) {
                    e.preventDefault();
                    toggleService(customService.trim());
                    setCustomService('');
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (customService.trim()) {
                    toggleService(customService.trim());
                    setCustomService('');
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b-address">Location</Label>
            <div className="flex gap-2">
              <Input
                id="b-address"
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
                placeholder="Street address and city"
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
                        setPoint({ latitude: r.latitude, longitude: r.longitude, city: r.city, country: r.country });
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
                <CheckCircle2 className="h-3.5 w-3.5" /> Location set{point.city ? ` — ${point.city}` : ''}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Switch id="b-online" checked={online} onCheckedChange={setOnline} />
              <Label htmlFor="b-online" className="text-sm font-normal text-muted-foreground">
                We serve customers online / nationwide
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-phone">Phone</Label>
              <Input id="b-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-email">Email for enquiries</Label>
              <Input id="b-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-web">Website</Label>
              <Input id="b-web" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-licence">Licence / registration (optional)</Label>
              <Input
                id="b-licence"
                value={licence}
                onChange={(e) => setLicence(e.target.value)}
                placeholder="e.g. TICO, ATOL, Saudi Ministry licence"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-lang">Languages</Label>
              <Input
                id="b-lang"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="English, Arabic, Urdu"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b-offer">Offer for Firdam members (optional)</Label>
            <Input
              id="b-offer"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="e.g. 5% off Ramadan Umrah packages"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {business ? 'Save changes' : 'Submit for review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
