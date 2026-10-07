'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Clock,
  ExternalLink,
  Globe,
  Heart,
  Loader2,
  MapPin,
  Moon,
  Navigation,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { directionsUrl, formatDistance } from '@/lib/geo/location';
import { displayNameFor } from '@/lib/auth/display-name';
import { cn } from '@/lib/utils';
import type { HalalPlaceReview } from '@/types/database';
import {
  CATEGORY_META,
  HALAL_STATUS_LABEL,
} from '@/features/halal-places/halal-places-config';
import { StarInput, StarRating } from '@/features/halal-places/star-rating';
import { HALAL_PLACES_CHANGED } from '@/features/halal-places/use-halal-places';
import type { HalalPlace, PlaceRating } from '@/features/halal-places/types';

interface PlaceDetailSheetProps {
  place: HalalPlace | null;
  rating?: PlaceRating;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaved: boolean;
  onToggleSave: (place: HalalPlace) => void;
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 break-words text-foreground">{children}</div>
    </div>
  );
}

function normalizeWebsite(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

type Confirmation = 'yes' | 'no' | 'unsure';

export function PlaceDetailSheet({
  place,
  rating,
  open,
  onOpenChange,
  isSaved,
  onToggleSave,
}: PlaceDetailSheetProps) {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<HalalPlaceReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation>('unsure');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const myReview = reviews.find((r) => r.user_id === user?.id) ?? null;

  const loadReviews = useCallback(async (key: string) => {
    setLoadingReviews(true);
    const { data, error } = await supabase
      .from('halal_place_reviews')
      .select('*')
      .eq('place_key', key)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) console.error('Failed to load reviews:', error.message);
    setReviews(data ?? []);
    setLoadingReviews(false);
  }, [supabase]);

  useEffect(() => {
    if (!open || !place) return;
    loadReviews(place.key);
  }, [open, place, loadReviews]);

  // Prefill the form with the user's existing review.
  useEffect(() => {
    if (myReview) {
      setStars(myReview.rating);
      setComment(myReview.comment ?? '');
      setConfirmation(
        myReview.halal_confirmed === true ? 'yes' : myReview.halal_confirmed === false ? 'no' : 'unsure'
      );
    } else {
      setStars(0);
      setComment('');
      setConfirmation('unsure');
    }
  }, [myReview, place?.key]);

  if (!place) return null;

  const meta = CATEGORY_META[place.category];
  const Icon = meta.icon;
  const isMosque = place.category === 'mosque';
  const isOwner = place.source === 'community' && place.ownerId === user?.id;

  const submitReview = async () => {
    if (stars < 1) {
      toast.error('Please choose a star rating.');
      return;
    }
    setSubmitting(true);
    const payload = {
      place_key: place.key,
      place_name: place.name,
      rating: stars,
      comment: comment.trim() || null,
      halal_confirmed: isMosque ? null : confirmation === 'unsure' ? null : confirmation === 'yes',
      author_name: displayNameFor(user),
      updated_at: new Date().toISOString(),
    };
    const { place_key: _key, ...changes } = payload;
    void _key;
    const { error } = myReview
      ? await supabase.from('halal_place_reviews').update(changes).eq('id', myReview.id)
      : await supabase.from('halal_place_reviews').insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error('Could not save your review', { description: error.message });
      return;
    }
    toast.success(myReview ? 'Review updated' : 'Thank you — your review helps the community');
    loadReviews(place.key);
    window.dispatchEvent(new Event(HALAL_PLACES_CHANGED));
  };

  const deletePlace = async () => {
    if (place.source !== 'community') return;
    if (!window.confirm(`Remove "${place.name}" from Firdam? This cannot be undone.`)) return;
    setDeleting(true);
    const id = place.key.replace('community:', '');
    const { error } = await supabase.from('halal_places').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      toast.error('Could not remove place', { description: error.message });
      return;
    }
    toast.success('Place removed');
    onOpenChange(false);
    window.dispatchEvent(new Event(HALAL_PLACES_CHANGED));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                meta.chip
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl leading-tight">{place.name}</SheetTitle>
              <SheetDescription className="mt-0.5">
                {meta.label}
                {place.distanceKm !== undefined && ` · ${formatDistance(place.distanceKm)} away`}
              </SheetDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-brand-sage/30 bg-brand-sage/10 text-brand-sage">
              {HALAL_STATUS_LABEL[place.halalStatus]}
            </Badge>
            {place.certification && (
              <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/5 text-primary">
                <BadgeCheck className="h-3 w-3" />
                Certified
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              {place.source === 'community' ? 'Added by the community' : 'OpenStreetMap'}
            </Badge>
          </div>

          {rating && rating.reviewCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <StarRating value={rating.avgRating} size="md" />
              <span className="font-medium text-foreground">{rating.avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({rating.reviewCount} review{rating.reviewCount === 1 ? '' : 's'})
              </span>
            </div>
          )}
        </SheetHeader>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button asChild>
            <a href={directionsUrl(place.latitude, place.longitude)} target="_blank" rel="noreferrer">
              <Navigation className="mr-2 h-4 w-4" />
              Directions
            </a>
          </Button>
          <Button variant="outline" onClick={() => onToggleSave(place)}>
            <Heart className={cn('mr-2 h-4 w-4', isSaved && 'fill-destructive text-destructive')} />
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>

        <div className="mt-6 space-y-3.5">
          {place.address && <InfoRow icon={MapPin}>{place.address}</InfoRow>}
          {place.certification && (
            <InfoRow icon={ShieldCheck}>
              <span className="text-muted-foreground">Certification: </span>
              {place.certification}
            </InfoRow>
          )}
          {place.cuisine && (
            <InfoRow icon={UtensilsCrossed}>
              <span className="capitalize">{place.cuisine}</span>
            </InfoRow>
          )}
          {place.openingHours && <InfoRow icon={Clock}>{place.openingHours}</InfoRow>}
          {place.phone && (
            <InfoRow icon={Phone}>
              <a href={`tel:${place.phone}`} className="text-primary hover:underline">
                {place.phone}
              </a>
            </InfoRow>
          )}
          {place.website && (
            <InfoRow icon={Globe}>
              <a
                href={normalizeWebsite(place.website)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </InfoRow>
          )}
          {place.notes && (
            <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">{place.notes}</p>
          )}
          {isMosque && (
            <Link
              href="/dashboard/prayer-times"
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
            >
              <Moon className="h-4 w-4 text-primary" />
              See today&apos;s prayer times
            </Link>
          )}
        </div>

        {!isMosque && rating && (rating.confirmations > 0 || rating.disputes > 0) && (
          <div className="mt-5 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-brand-sage/25 bg-brand-sage/10 p-3">
              <p className="font-display text-lg font-semibold text-brand-sage">{rating.confirmations}</p>
              <p className="text-xs text-muted-foreground">confirmed halal</p>
            </div>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="font-display text-lg font-semibold text-destructive">{rating.disputes}</p>
              <p className="text-xs text-muted-foreground">had concerns</p>
            </div>
          </div>
        )}

        <Separator className="my-6" />

        <section aria-labelledby="review-heading">
          <h3 id="review-heading" className="text-sm font-semibold text-foreground">
            {myReview ? 'Your review' : 'Share your experience'}
          </h3>
          <div className="mt-3 space-y-3">
            <StarInput value={stars} onChange={setStars} />
            {!isMosque && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Did you find it to be halal?
                </p>
                <div className="flex gap-1.5">
                  {(
                    [
                      ['yes', 'Yes, halal'],
                      ['no', 'I had concerns'],
                      ['unsure', 'Not sure'],
                    ] as [Confirmation, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setConfirmation(value)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        confirmation === value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isMosque
                  ? 'Parking, wudu facilities, sisters’ area, Jumu’ah times…'
                  : 'What did you buy or eat? Was the certificate displayed?'
              }
              rows={3}
              maxLength={2000}
            />
            <Button onClick={submitReview} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {myReview ? 'Update review' : 'Post review'}
            </Button>
          </div>
        </section>

        <section className="mt-6" aria-label="Community reviews">
          <h3 className="text-sm font-semibold text-foreground">Community reviews</h3>
          {loadingReviews ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
            </p>
          ) : reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No reviews yet. Be the first to help your community.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{r.author_name ?? 'Member'}</p>
                    <StarRating value={r.rating} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {r.halal_confirmed === true && (
                      <span className="inline-flex items-center gap-1 text-brand-sage">
                        <ShieldCheck className="h-3 w-3" /> Confirmed halal
                      </span>
                    )}
                    {r.halal_confirmed === false && (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <ShieldAlert className="h-3 w-3" /> Had concerns
                      </span>
                    )}
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Halal information comes from OpenStreetMap contributors and Firdam members. When in
          doubt, ask the store to see their current certificate.
        </p>

        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={deletePlace}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove this place
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
