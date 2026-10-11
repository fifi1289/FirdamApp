-- Free launch over: everyone is on the Free plan's limits (a household holds 2)
-- unless they have Firdam Family. Prices stay hidden in the app. Re-runnable.
CREATE OR REPLACE FUNCTION public.free_launch()
RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
