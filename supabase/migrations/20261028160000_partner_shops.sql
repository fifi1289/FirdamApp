-- Partner shops (Muslim-owned businesses) shown in Shopping, and the taps Firdam sends them.
CREATE TABLE IF NOT EXISTS public.partner_shops (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  department     text NOT NULL CHECK (department IN ('groceries', 'household', 'clothing', 'kids', 'gifts')),
  description    text CHECK (char_length(description) <= 300),
  city           text CHECK (char_length(city) <= 80),
  ships          text CHECK (char_length(ships) <= 120),
  how_to_order   text CHECK (char_length(how_to_order) <= 200),
  url            text NOT NULL CHECK (url ~ '^https://'),
  image_url      text CHECK (image_url IS NULL OR image_url ~ '^https://'),
  photos         text[] NOT NULL DEFAULT '{}' CHECK (cardinality(photos) <= 4),
  discount_code  text CHECK (char_length(discount_code) <= 30),
  discount_text  text CHECK (char_length(discount_text) <= 80),
  free_until     date,
  terms_accepted_at timestamptz,
  active         boolean NOT NULL DEFAULT true,
  position       integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partner_shops_read ON public.partner_shops;
CREATE POLICY partner_shops_read ON public.partner_shops FOR SELECT TO authenticated USING (active OR public.is_admin());
DROP POLICY IF EXISTS partner_shops_admin ON public.partner_shops;
CREATE POLICY partner_shops_admin ON public.partner_shops FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.partner_clicks (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  partner_id  uuid NOT NULL REFERENCES public.partner_shops(id) ON DELETE CASCADE,
  user_id     uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  source      text CHECK (source IN ('web', 'app')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_clicks_partner_time ON public.partner_clicks (partner_id, created_at);
ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partner_clicks_insert ON public.partner_clicks;
CREATE POLICY partner_clicks_insert ON public.partner_clicks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.partner_shops p WHERE p.id = partner_id AND p.active));
DROP POLICY IF EXISTS partner_clicks_admin_read ON public.partner_clicks;
CREATE POLICY partner_clicks_admin_read ON public.partner_clicks FOR SELECT TO authenticated USING (public.is_admin());

-- Admin summary: taps per partner (last 30 days and all time). Counts only, never who tapped.
CREATE OR REPLACE FUNCTION public.partner_click_counts()
RETURNS TABLE (partner_id uuid, last_30_days bigint, total bigint, families bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.partner_id,
         count(*) FILTER (WHERE c.created_at > now() - interval '30 days'),
         count(*),
         count(DISTINCT c.user_id)
  FROM public.partner_clicks c
  WHERE public.is_admin()
  GROUP BY c.partner_id;
$$;
REVOKE EXECUTE ON FUNCTION public.partner_click_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_click_counts() TO authenticated;

-- Logos and up to four product photos per partner, uploaded by admins (small, compressed files).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('partner-images', 'partner-images', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "partner_images_admin_insert" ON storage.objects;
    CREATE POLICY "partner_images_admin_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'partner-images' AND public.is_admin());
    DROP POLICY IF EXISTS "partner_images_admin_update" ON storage.objects;
    CREATE POLICY "partner_images_admin_update" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'partner-images' AND public.is_admin());
    DROP POLICY IF EXISTS "partner_images_admin_delete" ON storage.objects;
    CREATE POLICY "partner_images_admin_delete" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'partner-images' AND public.is_admin());
  END IF;
END $$;
