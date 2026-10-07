/*
# Halal Places

## Purpose
Backs the Halal Places module: a finder for halal grocers, butchers,
restaurants, cafés and mosques. Map data comes from OpenStreetMap (through
the `halal-places` edge function); this migration adds the community layer
on top of it:

- `halal_places`         places added by Firdam users (shared with everyone)
- `halal_place_reviews`  ratings, comments and halal confirmations for any
                         place — community or OpenStreetMap — keyed by a
                         stable `place_key` (`community:<uuid>` or
                         `osm:node/123`)
- `saved_halal_places`   each user's private list of favourite places
- `halal_place_ratings`  RPC returning aggregate ratings for a set of keys

## Security
- RLS on every table.
- Community places and reviews are readable by every signed-in user, but
  only the author can update or delete their own rows.
- Saved places are private to their owner.
- `user_id` defaults to auth.uid() so client inserts can omit it.

## Idempotency
IF NOT EXISTS / DROP IF EXISTS throughout, so re-running is safe.
*/

-- ── Community places ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.halal_places (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  category       text NOT NULL DEFAULT 'grocery'
                 CHECK (category IN ('grocery', 'butcher', 'restaurant', 'cafe', 'mosque', 'other')),
  address        text,
  city           text,
  country        text,
  latitude       double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude      double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  phone          text,
  website        text,
  certification  text,
  halal_status   text NOT NULL DEFAULT 'halal'
                 CHECK (halal_status IN ('halal', 'halal_options', 'muslim_owned')),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.halal_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "halal_places_select_all" ON public.halal_places;
CREATE POLICY "halal_places_select_all"
  ON public.halal_places FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "halal_places_insert_own" ON public.halal_places;
CREATE POLICY "halal_places_insert_own"
  ON public.halal_places FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "halal_places_update_own" ON public.halal_places;
CREATE POLICY "halal_places_update_own"
  ON public.halal_places FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "halal_places_delete_own" ON public.halal_places;
CREATE POLICY "halal_places_delete_own"
  ON public.halal_places FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_halal_places_lat_lng
  ON public.halal_places (latitude, longitude);

-- ── Reviews ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.halal_place_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  place_key       text NOT NULL CHECK (char_length(place_key) <= 120),
  place_name      text,
  rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text CHECK (comment IS NULL OR char_length(comment) <= 2000),
  halal_confirmed boolean,
  author_name     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_key)
);

ALTER TABLE public.halal_place_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "halal_place_reviews_select_all" ON public.halal_place_reviews;
CREATE POLICY "halal_place_reviews_select_all"
  ON public.halal_place_reviews FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "halal_place_reviews_insert_own" ON public.halal_place_reviews;
CREATE POLICY "halal_place_reviews_insert_own"
  ON public.halal_place_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "halal_place_reviews_update_own" ON public.halal_place_reviews;
CREATE POLICY "halal_place_reviews_update_own"
  ON public.halal_place_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "halal_place_reviews_delete_own" ON public.halal_place_reviews;
CREATE POLICY "halal_place_reviews_delete_own"
  ON public.halal_place_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_halal_place_reviews_place
  ON public.halal_place_reviews (place_key, created_at DESC);

-- ── Saved places ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_halal_places (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  place_key   text NOT NULL,
  snapshot    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_key)
);

ALTER TABLE public.saved_halal_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_halal_places_select_own" ON public.saved_halal_places;
CREATE POLICY "saved_halal_places_select_own"
  ON public.saved_halal_places FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_halal_places_insert_own" ON public.saved_halal_places;
CREATE POLICY "saved_halal_places_insert_own"
  ON public.saved_halal_places FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_halal_places_delete_own" ON public.saved_halal_places;
CREATE POLICY "saved_halal_places_delete_own"
  ON public.saved_halal_places FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── Aggregate ratings ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.halal_place_ratings(keys text[])
RETURNS TABLE (
  place_key      text,
  avg_rating     numeric,
  review_count   bigint,
  confirmations  bigint,
  disputes       bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.place_key,
    round(avg(r.rating)::numeric, 1)                     AS avg_rating,
    count(*)                                             AS review_count,
    count(*) FILTER (WHERE r.halal_confirmed IS TRUE)    AS confirmations,
    count(*) FILTER (WHERE r.halal_confirmed IS FALSE)   AS disputes
  FROM public.halal_place_reviews r
  WHERE r.place_key = ANY(keys)
  GROUP BY r.place_key;
$$;

GRANT EXECUTE ON FUNCTION public.halal_place_ratings(text[]) TO authenticated;
