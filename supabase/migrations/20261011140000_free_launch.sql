-- Free launch: everyone gets the full app at no cost, including households of
-- up to 8 people. To start paid plans, make free_launch() return false (and
-- set FREE_LAUNCH to false in lib/plan/launch.ts and _shared/plan.ts). Re-runnable.

CREATE OR REPLACE FUNCTION public.free_launch()
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT true $$;

CREATE OR REPLACE FUNCTION public.household_capacity(hid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.free_launch() OR public.household_is_paid(hid) OR public.is_admin() THEN 8 ELSE 2 END;
$$;
REVOKE EXECUTE ON FUNCTION public.household_capacity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.household_capacity(uuid) TO authenticated;
