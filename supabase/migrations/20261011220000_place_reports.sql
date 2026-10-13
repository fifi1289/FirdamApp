-- Community place reports: families can flag a listing (not halal, closed,
-- wrong info, spam, or something else). Admins review them in the Supabase
-- dashboard and can hide or fix the place. Re-runnable.

CREATE TABLE IF NOT EXISTS public.place_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.halal_places(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  reason text NOT NULL CHECK (reason IN ('not_halal', 'closed', 'wrong_info', 'spam', 'other')),
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One open report per person per place; reporting again after it was reviewed is fine.
CREATE UNIQUE INDEX IF NOT EXISTS place_reports_one_open_per_person
  ON public.place_reports (place_id, reporter_id)
  WHERE status = 'open';

ALTER TABLE public.place_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "place_reports_insert_own" ON public.place_reports;
CREATE POLICY "place_reports_insert_own" ON public.place_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "place_reports_select_own_or_admin" ON public.place_reports;
CREATE POLICY "place_reports_select_own_or_admin" ON public.place_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "place_reports_admin_update" ON public.place_reports;
CREATE POLICY "place_reports_admin_update" ON public.place_reports FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
