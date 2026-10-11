-- Places added by families wait for an admin before others can see them.
-- The person who added a place still sees it (marked as waiting). Re-runnable.

ALTER TABLE public.halal_places ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
-- Places that were already listed stay visible.
UPDATE public.halal_places SET status = 'approved'
  WHERE status = 'pending' AND created_at < '2026-10-11 13:30:00+00';
ALTER TABLE public.halal_places DROP CONSTRAINT IF EXISTS halal_places_status_check;
ALTER TABLE public.halal_places ADD CONSTRAINT halal_places_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER POLICY "halal_places_select_all" ON public.halal_places
  USING (status = 'approved' OR user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "halal_places_admin_update" ON public.halal_places;
CREATE POLICY "halal_places_admin_update" ON public.halal_places FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Only admins can approve: a new or edited place by anyone else goes back to "pending".
CREATE OR REPLACE FUNCTION public.halal_place_needs_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS halal_place_needs_review ON public.halal_places;
CREATE TRIGGER halal_place_needs_review BEFORE INSERT OR UPDATE ON public.halal_places
  FOR EACH ROW EXECUTE FUNCTION public.halal_place_needs_review();
