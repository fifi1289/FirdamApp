-- Shops asking to become Firdam partners (public form on firdam.com/partners).
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name     text NOT NULL CHECK (char_length(shop_name) BETWEEN 1 AND 80),
  owner_name    text NOT NULL CHECK (char_length(owner_name) BETWEEN 1 AND 80),
  email         text NOT NULL CHECK (char_length(email) <= 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text CHECK (char_length(phone) <= 30),
  department    text NOT NULL CHECK (department IN ('groceries', 'household', 'clothing', 'kids', 'gifts')),
  city          text CHECK (char_length(city) <= 80),
  link          text NOT NULL CHECK (char_length(link) <= 300 AND link ~ '^https?://'),
  description   text CHECK (char_length(description) <= 500),
  ships         text CHECK (char_length(ships) <= 120),
  terms_agreed  boolean NOT NULL CHECK (terms_agreed),
  status        text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'added', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_applications_created ON public.partner_applications (created_at DESC);
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can apply (signed in or not); only admins can read or manage applications.
DROP POLICY IF EXISTS partner_applications_insert ON public.partner_applications;
CREATE POLICY partner_applications_insert ON public.partner_applications FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'new');
DROP POLICY IF EXISTS partner_applications_admin ON public.partner_applications;
CREATE POLICY partner_applications_admin ON public.partner_applications FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Simple spam guard: at most 3 applications per email per day and 30 in total per hour.
CREATE OR REPLACE FUNCTION public.partner_applications_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.partner_applications
      WHERE lower(email) = lower(NEW.email) AND created_at > now() - interval '1 day') >= 3
     OR (SELECT count(*) FROM public.partner_applications WHERE created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'Too many applications right now. Please try again later or email us.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS partner_applications_limit ON public.partner_applications;
CREATE TRIGGER partner_applications_limit BEFORE INSERT ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.partner_applications_limit();
