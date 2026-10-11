-- Free launch over: everyone is on the Free plan's limits (a household holds 4)
-- unless they have Firdam Family. Prices stay hidden in the app. Re-runnable.
CREATE OR REPLACE FUNCTION public.free_launch()
RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;

-- A free household holds 4 people; Firdam Family up to 8.
CREATE OR REPLACE FUNCTION public.household_capacity(hid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.free_launch() OR public.household_is_paid(hid) OR public.is_admin() THEN 8 ELSE 4 END;
$$;
