-- Partners fill in their whole listing themselves: logo, photos, discount,
-- how to order and what they offer. Applying needs a (free) Firdam account so
-- uploads are tied to a person; uploads go to a folder named after them.
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS how_to_order text;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS discount_code text;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS discount_text text;
ALTER TABLE public.partner_applications DROP CONSTRAINT IF EXISTS partner_applications_extra_check;
ALTER TABLE public.partner_applications ADD CONSTRAINT partner_applications_extra_check CHECK (
  (logo_url IS NULL OR logo_url ~ '^https://') AND cardinality(photos) <= 4 AND cardinality(topics) <= 6
  AND char_length(coalesce(how_to_order, '')) <= 200 AND char_length(coalesce(discount_code, '')) <= 30
  AND char_length(coalesce(discount_text, '')) <= 80);

-- Signed-in applicants only, as themselves.
DROP POLICY IF EXISTS partner_applications_insert ON public.partner_applications;
CREATE POLICY partner_applications_insert ON public.partner_applications FOR INSERT TO authenticated
  WITH CHECK (status = 'new' AND user_id = auth.uid());

-- Logos and photos applicants upload (public to read, so the listing can use them).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('partner-uploads', 'partner-uploads', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 3145728, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "partner_uploads_own_insert" ON storage.objects;
    CREATE POLICY "partner_uploads_own_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'partner-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
    DROP POLICY IF EXISTS "partner_uploads_admin_delete" ON storage.objects;
    CREATE POLICY "partner_uploads_admin_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'partner-uploads' AND public.is_admin());
  END IF;
END $$;

-- Private contact details for each partner (for monthly reports). Admins only:
-- listings themselves are readable by every signed-in family, so emails live here.
CREATE TABLE IF NOT EXISTS public.partner_contacts (
  partner_id  uuid PRIMARY KEY REFERENCES public.partner_shops(id) ON DELETE CASCADE,
  owner_name  text CHECK (char_length(owner_name) <= 80),
  email       text CHECK (email IS NULL OR (char_length(email) <= 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone       text CHECK (char_length(phone) <= 30),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partner_contacts_admin ON public.partner_contacts;
CREATE POLICY partner_contacts_admin ON public.partner_contacts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
