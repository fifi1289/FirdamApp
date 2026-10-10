/*
# Two-step verification is enforced by the database too

If someone turns on two-step verification, a session that has only passed the
password step (assurance level "aal1") can't read or change any of their data
— not even by calling the database API directly. Only after the code is
verified ("aal2") do the normal row-level security rules apply.

People without two-step verification are not affected.

Implemented as a RESTRICTIVE policy on every table that has row-level
security, so it is combined (AND) with each table's existing rules.
*/

CREATE OR REPLACE FUNCTION public.mfa_satisfied()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_factor boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN true; END IF;
  IF coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' THEN RETURN true; END IF;
  IF to_regclass('auth.mfa_factors') IS NULL THEN RETURN true; END IF;
  EXECUTE 'SELECT EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = $1 AND status = ''verified'')'
    INTO has_factor USING auth.uid();
  RETURN NOT has_factor;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mfa_satisfied() TO authenticated, anon;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'require_2fa_when_enabled', t.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.mfa_satisfied()) WITH CHECK (public.mfa_satisfied())',
      'require_2fa_when_enabled', t.relname
    );
  END LOOP;
END $$;
