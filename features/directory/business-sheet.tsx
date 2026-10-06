'use client';

import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  ExternalLink,
  Globe,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { directionsUrl, formatDistance } from '@/lib/geo/location';
import { displayNameFor } from '@/lib/auth/display-name';
import type { Business } from '@/types/database';
import { BUSINESS_CATEGORIES, TRAVEL_CATEGORIES } from '@/features/directory/directory-config';

function site(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function BusinessSheet({
  business,
  distanceKm,
  open,
  onOpenChange,
}: {
  business: Business | null;
  distanceKm?: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [travellers, setTravellers] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user ? displayNameFor(user) : '');
    setEmail(user?.email ?? '');
    setPhone('');
    setMessage('');
    setDate('');
    setTravellers('');
    setSent(false);
  }, [open, user]);

  if (!business) return null;
  const meta = BUSINESS_CATEGORIES[business.category];
  const Icon = meta.icon;
  const isTravel = TRAVEL_CATEGORIES.includes(business.category);
  const isOwn = business.owner_id === user?.id;

  const send = async () => {
    if (!message.trim()) return toast.error('Write a short message.');
    if (!email.trim()) return toast.error('Add your email so they can reply.');
    setSending(true);
    const { error } = await supabase.from('business_enquiries').insert({
      business_id: business.id,
      name: name.trim() || 'Firdam member',
      email: email.trim(),
      phone: phone.trim() || null,
      message: message.trim(),
      travel_date: date || null,
      travellers: travellers ? Math.max(1, Math.min(100, Number(travellers))) : null,
    });
    setSending(false);
    if (error) {
      toast.error('Could not send your enquiry', { description: error.message });
      return;
    }
    setSent(true);
    toast.success(`Enquiry sent to ${business.name}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl leading-tight">{business.name}</SheetTitle>
              <SheetDescription>
                {meta.label}
                {business.city ? ` · ${business.city}` : ''}
                {distanceKm !== undefined ? ` · ${formatDistance(distanceKm)}` : ''}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {business.is_partner && (
              <Badge className="gap-1 bg-brand-gold text-brand-espresso hover:bg-brand-gold">
                <BadgeCheck className="h-3 w-3" /> Firdam Partner
              </Badge>
            )}
            {business.licence_number && (
              <Badge variant="outline" className="gap-1 border-brand-sage/30 bg-brand-sage/10 text-brand-sage">
                <ShieldCheck className="h-3 w-3" /> Licensed
              </Badge>
            )}
            {business.serves_online && <Badge variant="secondary">Serves online</Badge>}
            {business.status !== 'approved' && (
              <Badge variant="outline">{business.status === 'pending' ? 'Awaiting review' : 'Not approved'}</Badge>
            )}
          </div>
        </SheetHeader>

        {business.partner_offer && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-3 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#7a5a30] dark:text-brand-gold" />
            <span className="text-foreground">
              <span className="font-semibold">Firdam member offer: </span>
              {business.partner_offer}
            </span>
          </div>
        )}

        {business.description && (
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{business.description}</p>
        )}

        {business.services.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {business.services.map((s) => (
              <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-3 text-sm">
          {business.address && (
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              {business.address}
            </p>
          )}
          {business.phone && (
            <a href={`tel:${business.phone}`} className="flex items-center gap-3 text-primary hover:underline">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {business.phone}
            </a>
          )}
          {business.email && (
            <a href={`mailto:${business.email}`} className="flex items-center gap-3 text-primary hover:underline">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {business.email}
            </a>
          )}
          {business.website && (
            <a
              href={site(business.website)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-primary hover:underline"
            >
              <Globe className="h-4 w-4 text-muted-foreground" />
              {business.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {business.languages.length > 0 && (
            <p className="flex items-center gap-3">
              <Languages className="h-4 w-4 text-muted-foreground" />
              {business.languages.join(', ')}
            </p>
          )}
          {business.licence_number && (
            <p className="flex items-center gap-3 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Licence: {business.licence_number}
            </p>
          )}
          {business.latitude != null && business.longitude != null && (
            <Button asChild variant="outline" size="sm">
              <a href={directionsUrl(business.latitude, business.longitude)} target="_blank" rel="noreferrer">
                <Navigation className="mr-2 h-4 w-4" /> Directions
              </a>
            </Button>
          )}
        </div>

        {!isOwn && business.status === 'approved' && (
          <>
            <Separator className="my-6" />
            {sent ? (
              <div className="rounded-2xl bg-brand-sage/10 p-4 text-sm text-brand-sage">
                Your enquiry was sent. {business.name} will reply to {email}. You can see your enquiries
                under Directory → My enquiries.
              </div>
            ) : (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Send an enquiry</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="e-name" className="text-xs">Name</Label>
                    <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="e-phone" className="text-xs">Phone (optional)</Label>
                    <Input id="e-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-email" className="text-xs">Email</Label>
                  <Input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {isTravel && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="e-date" className="text-xs">Travel date</Label>
                      <Input id="e-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="e-trav" className="text-xs">Travellers</Label>
                      <Input
                        id="e-trav"
                        inputMode="numeric"
                        value={travellers}
                        onChange={(e) => setTravellers(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="e-msg" className="text-xs">Message</Label>
                  <Textarea
                    id="e-msg"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder={
                      business.category === 'hajj_umrah'
                        ? 'Assalamu alaikum, we are a family of 4 interested in an Umrah package in…'
                        : 'Assalamu alaikum, I’d like to know more about…'
                    }
                  />
                </div>
                <Button onClick={send} disabled={sending} className="w-full">
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send enquiry
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Your name, email and message are shared with this business so they can reply.
                </p>
              </section>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
