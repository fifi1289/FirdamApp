/*
# Community events

Local events posted by Firdam members: halaqas, community iftars, Eid
prayers, fundraisers, volunteering, sisters' and youth events.

- `community_events`  visible to all signed-in users while `active`;
                      authors and admins can edit or remove them
- `event_rsvps`       who is going / interested (private to each user;
                      totals come from `event_rsvp_counts`)
- `event_reports`     members flag inappropriate events; admins review
*/

CREATE TABLE IF NOT EXISTS public.community_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  kind         text NOT NULL DEFAULT 'other' CHECK (kind IN ('halaqa', 'iftar', 'eid', 'jumuah', 'fundraiser',
                 'volunteering', 'sisters', 'youth', 'kids', 'social', 'class', 'other')),
  description  text CHECK (description IS NULL OR char_length(description) <= 3000),
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  venue        text,
  address      text,
  latitude     double precision CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude    double precision CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  online_url   text,
  organizer    text,
  contact      text,
  audience     text NOT NULL DEFAULT 'everyone' CHECK (audience IN ('everyone', 'brothers', 'sisters', 'families', 'youth', 'kids')),
  is_free      boolean NOT NULL DEFAULT true,
  price        text,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_events_select" ON public.community_events;
CREATE POLICY "community_events_select" ON public.community_events
  FOR SELECT TO authenticated USING (status = 'active' OR user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "community_events_insert_own" ON public.community_events;
CREATE POLICY "community_events_insert_own" ON public.community_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'active');
DROP POLICY IF EXISTS "community_events_update" ON public.community_events;
CREATE POLICY "community_events_update" ON public.community_events
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "community_events_delete" ON public.community_events;
CREATE POLICY "community_events_delete" ON public.community_events
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Authors can't un-hide an event an admin hid.
CREATE OR REPLACE FUNCTION public.protect_event_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() AND NEW.status IS DISTINCT FROM OLD.status AND OLD.status = 'hidden' THEN
    NEW.status := OLD.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS community_events_protect_status ON public.community_events;
CREATE TRIGGER community_events_protect_status
  BEFORE UPDATE ON public.community_events
  FOR EACH ROW EXECUTE FUNCTION public.protect_event_status();

CREATE INDEX IF NOT EXISTS idx_community_events_start ON public.community_events (status, starts_at);
CREATE INDEX IF NOT EXISTS idx_community_events_geo ON public.community_events (latitude, longitude);

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  event_id    uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_rsvps_select_own" ON public.event_rsvps;
CREATE POLICY "event_rsvps_select_own" ON public.event_rsvps FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "event_rsvps_insert_own" ON public.event_rsvps;
CREATE POLICY "event_rsvps_insert_own" ON public.event_rsvps FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "event_rsvps_update_own" ON public.event_rsvps;
CREATE POLICY "event_rsvps_update_own" ON public.event_rsvps FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "event_rsvps_delete_own" ON public.event_rsvps;
CREATE POLICY "event_rsvps_delete_own" ON public.event_rsvps FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.event_rsvp_counts(ids uuid[])
RETURNS TABLE (event_id uuid, going bigint, interested bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.event_id,
         count(*) FILTER (WHERE r.status = 'going'),
         count(*) FILTER (WHERE r.status = 'interested')
  FROM public.event_rsvps r
  JOIN public.community_events e ON e.id = r.event_id
  WHERE r.event_id = ANY(ids) AND (e.status = 'active' OR e.user_id = auth.uid() OR public.is_admin())
  GROUP BY r.event_id;
$$;
GRANT EXECUTE ON FUNCTION public.event_rsvp_counts(uuid[]) TO authenticated;

CREATE TABLE IF NOT EXISTS public.event_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_reports_insert_own" ON public.event_reports;
CREATE POLICY "event_reports_insert_own" ON public.event_reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "event_reports_select" ON public.event_reports;
CREATE POLICY "event_reports_select" ON public.event_reports FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "event_reports_delete_admin" ON public.event_reports;
CREATE POLICY "event_reports_delete_admin" ON public.event_reports FOR DELETE TO authenticated USING (public.is_admin());
