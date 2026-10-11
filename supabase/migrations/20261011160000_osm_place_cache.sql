-- Last good OpenStreetMap answer per area, so halal places still show when the
-- public map servers are busy. Only the halal-places function (service role)
-- reads and writes it. Re-runnable.
CREATE TABLE IF NOT EXISTS public.osm_place_cache (
  key        text PRIMARY KEY,
  body       jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.osm_place_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.osm_place_cache FROM anon, authenticated;
