-- A trustworthy record that each business applied and agreed itself.
-- Saved with every application: the exact terms text and version, the browser
-- they used, the page, and (filled in by the database, not the browser) the
-- signed-in account's email, whether it was verified, and the time.
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS terms_text text;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS submitted_from text;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS account_email text;
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS account_verified boolean;
ALTER TABLE public.partner_applications DROP CONSTRAINT IF EXISTS partner_applications_consent_check;
ALTER TABLE public.partner_applications ADD CONSTRAINT partner_applications_consent_check CHECK (
  char_length(coalesce(terms_version, '')) <= 20 AND char_length(coalesce(terms_text, '')) <= 5000
  AND char_length(coalesce(user_agent, '')) <= 400 AND char_length(coalesce(submitted_from, '')) <= 300);

-- Filled in by the database on submit, so nobody can fake them from a browser.
CREATE OR REPLACE FUNCTION public.partner_applications_stamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  NEW.user_id := auth.uid();
  SELECT u.email, u.email_confirmed_at IS NOT NULL INTO NEW.account_email, NEW.account_verified
  FROM auth.users u WHERE u.id = auth.uid();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS partner_applications_stamp ON public.partner_applications;
CREATE TRIGGER partner_applications_stamp BEFORE INSERT ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.partner_applications_stamp();

-- Locked once submitted: only the status can change (not even the admin can
-- edit what the business wrote or agreed to), and added partners' applications
-- can't be deleted.
CREATE OR REPLACE FUNCTION public.partner_applications_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'added' THEN
      RAISE EXCEPTION 'This application is the record of a partner''s agreement and can''t be deleted.';
    END IF;
    RETURN OLD;
  END IF;
  IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
    RAISE EXCEPTION 'Applications are locked once submitted; only the status can change.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS partner_applications_lock ON public.partner_applications;
CREATE TRIGGER partner_applications_lock BEFORE UPDATE OR DELETE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.partner_applications_lock();

-- Which application a partner listing came from (for "Agreed on … by …" in Admin).
ALTER TABLE public.partner_shops ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.partner_applications(id) ON DELETE SET NULL;

-- Link listings already created from an application (same business name).
UPDATE public.partner_shops s SET application_id = a.id
FROM public.partner_applications a
WHERE s.application_id IS NULL AND a.status = 'added' AND lower(a.shop_name) = lower(s.name);
