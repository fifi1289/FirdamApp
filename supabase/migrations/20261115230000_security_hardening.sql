-- Security hardening from the Supabase security advisor.

-- 1. Functions that only signed-in families (or triggers) use: nobody signed out can call them.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'accept_household_invite', 'create_household', 'household_capacity', 'household_is_paid', 'is_admin',
      'leave_household', 'mfa_satisfied', 'my_display_name', 'my_household_id', 'remove_household_member',
      'handle_new_user', 'halal_place_needs_review', 'partner_applications_limit', 'partner_applications_stamp')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.sig);
    -- The Supabase roles exist on the real project (not in a plain test database).
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.sig);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      -- Trigger functions run by themselves; the others are for signed-in families.
      IF f.proname NOT IN ('handle_new_user', 'halal_place_needs_review', 'partner_applications_limit', 'partner_applications_stamp') THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
      ELSE
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f.sig);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 2. A fixed search path for every function that had none.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('handle_updated_at', 'set_updated_at', 'free_launch', 'ingredient_grams', 'ingredient_micros', 'recipe_micros')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.sig);
  END LOOP;
END $$;
