-- Halal places from OpenStreetMap, kept in our own database so the app can
-- always show them. A GitHub job fetches areas people search in (place_areas)
-- and stores them here through the halal-places function. Re-runnable.

CREATE TABLE IF NOT EXISTS public.osm_places (
  key            text PRIMARY KEY,
  tile           text NOT NULL,
  name           text NOT NULL,
  category       text NOT NULL,
  latitude       double precision NOT NULL,
  longitude      double precision NOT NULL,
  address        text,
  phone          text,
  website        text,
  opening_hours  text,
  halal_status   text NOT NULL,
  certification  text,
  cuisine        text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS osm_places_lat_lng ON public.osm_places (latitude, longitude);
CREATE INDEX IF NOT EXISTS osm_places_tile ON public.osm_places (tile);
ALTER TABLE public.osm_places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "osm_places_read" ON public.osm_places;
CREATE POLICY "osm_places_read" ON public.osm_places FOR SELECT TO authenticated USING (true);

-- Map tiles (0.2° squares) people have searched, and when each was last fetched.
CREATE TABLE IF NOT EXISTS public.place_areas (
  tile          text PRIMARY KEY,
  south         double precision NOT NULL,
  west          double precision NOT NULL,
  north         double precision NOT NULL,
  east          double precision NOT NULL,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  fetched_at    timestamptz,
  attempts      integer NOT NULL DEFAULT 0
);
ALTER TABLE public.place_areas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.place_areas FROM anon, authenticated;
