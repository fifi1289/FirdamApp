/*
# Business directory, enquiries and trips

## businesses
Muslim-friendly businesses — travel agencies, Hajj & Umrah operators,
halal hotels, schools, tutors, caterers, Islamic finance. Anyone signed in
can apply to list a business; listings stay `pending` until an admin
approves them. Admins can also mark a listing as a Firdam Partner and
feature it (the basis for paid partnerships).

Owners can edit their listing details but cannot change status, partner
or featured flags — a trigger protects those columns for non-admins.

## business_enquiries
Leads sent from Firdam users to a business (e.g. an Umrah package
enquiry). Visible to the sender, the business owner and admins.

## trips
Each user's planned trips with destination, dates and a packing checklist.
*/

CREATE TABLE IF NOT EXISTS public.businesses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  category         text NOT NULL CHECK (category IN ('travel_agency', 'hajj_umrah', 'halal_hotel', 'tour_guide',
                     'islamic_school', 'tutor', 'halal_catering', 'islamic_finance', 'other')),
  description      text CHECK (description IS NULL OR char_length(description) <= 2000),
  services         text[] NOT NULL DEFAULT '{}',
  address          text,
  city             text,
  country          text,
  latitude         double precision CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude        double precision CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  serves_online    boolean NOT NULL DEFAULT false,
  phone            text,
  email            text,
  website          text,
  logo_url         text,
  licence_number   text,
  languages        text[] NOT NULL DEFAULT '{}',
  partner_offer    text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_partner       boolean NOT NULL DEFAULT false,
  featured         boolean NOT NULL DEFAULT false,
  admin_note       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "businesses_select" ON public.businesses;
CREATE POLICY "businesses_select" ON public.businesses
  FOR SELECT TO authenticated
  USING (status = 'approved' OR owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "businesses_insert_own" ON public.businesses;
CREATE POLICY "businesses_insert_own" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (public.is_admin() OR (status = 'pending' AND NOT is_partner AND NOT featured)));

DROP POLICY IF EXISTS "businesses_update" ON public.businesses;
CREATE POLICY "businesses_update" ON public.businesses
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "businesses_delete" ON public.businesses;
CREATE POLICY "businesses_delete" ON public.businesses
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.protect_business_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.status := OLD.status;
    NEW.is_partner := OLD.is_partner;
    NEW.featured := OLD.featured;
    NEW.admin_note := OLD.admin_note;
    NEW.owner_id := OLD.owner_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_protect_admin_fields ON public.businesses;
CREATE TRIGGER businesses_protect_admin_fields
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.protect_business_admin_fields();

CREATE INDEX IF NOT EXISTS idx_businesses_status_category ON public.businesses (status, category);

CREATE TABLE IF NOT EXISTS public.business_enquiries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email        text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 200),
  phone        text,
  message      text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  travel_date  date,
  travellers   integer CHECK (travellers IS NULL OR travellers BETWEEN 1 AND 100),
  status       text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enquiries_insert_own" ON public.business_enquiries;
CREATE POLICY "enquiries_insert_own" ON public.business_enquiries
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'approved')
  );

DROP POLICY IF EXISTS "enquiries_select" ON public.business_enquiries;
CREATE POLICY "enquiries_select" ON public.business_enquiries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "enquiries_update_business" ON public.business_enquiries;
CREATE POLICY "enquiries_update_business" ON public.business_enquiries
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_enquiries_business ON public.business_enquiries (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.trips (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name               text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  kind               text NOT NULL DEFAULT 'holiday'
                     CHECK (kind IN ('holiday', 'umrah', 'hajj', 'family_visit', 'business', 'other')),
  destination_label  text NOT NULL,
  latitude           double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude          double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  start_date         date,
  end_date           date,
  travellers         integer NOT NULL DEFAULT 1 CHECK (travellers BETWEEN 1 AND 50),
  budget             numeric(14,2),
  notes              text CHECK (notes IS NULL OR char_length(notes) <= 4000),
  checklist          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE op text;
BEGIN
  FOREACH op IN ARRAY ARRAY['select', 'insert', 'update', 'delete'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.trips', 'trips_' || op || '_own');
  END LOOP;
END $$;
CREATE POLICY "trips_select_own" ON public.trips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trips_insert_own" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_update_own" ON public.trips FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_delete_own" ON public.trips FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trips_user_start ON public.trips (user_id, start_date);
