-- The 2FA check (require_2fa_when_enabled) ran once per row (plpgsql + dynamic
-- SQL), so loading the recipe library (2,000+ recipes with ingredients, steps
-- and tags) hit the 8 s statement timeout. Wrapped in a sub-select, Postgres
-- runs it once per query (~6 s → ~0.1 s). The rule itself is unchanged.
SET lock_timeout = '20s';
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT schemaname, tablename, cmd, with_check FROM pg_policies
           WHERE policyname = 'require_2fa_when_enabled' AND qual = 'mfa_satisfied()'
           ORDER BY tablename
  LOOP
    IF p.cmd IN ('ALL', 'UPDATE') AND p.with_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY require_2fa_when_enabled ON %I.%I USING ((SELECT public.mfa_satisfied())) WITH CHECK ((SELECT public.mfa_satisfied()))', p.schemaname, p.tablename);
    ELSE
      EXECUTE format('ALTER POLICY require_2fa_when_enabled ON %I.%I USING ((SELECT public.mfa_satisfied()))', p.schemaname, p.tablename);
    END IF;
  END LOOP;
  FOR p IN SELECT schemaname, tablename FROM pg_policies
           WHERE policyname = 'require_2fa_when_enabled' AND qual IS NULL AND with_check = 'mfa_satisfied()'
  LOOP
    EXECUTE format('ALTER POLICY require_2fa_when_enabled ON %I.%I WITH CHECK ((SELECT public.mfa_satisfied()))', p.schemaname, p.tablename);
  END LOOP;
END $$;
