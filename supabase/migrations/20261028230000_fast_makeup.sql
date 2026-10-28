-- Days to make up (qada): Ramadan days someone didn't fast and makes up before
-- the next Ramadan. Private to each person: never shared with the household,
-- and no reason is stored.
CREATE TABLE IF NOT EXISTS public.fast_makeup (
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ramadan_year  integer NOT NULL CHECK (ramadan_year BETWEEN 1400 AND 1600),
  missed        smallint NOT NULL DEFAULT 0 CHECK (missed BETWEEN 0 AND 30),
  made_up       date[] NOT NULL DEFAULT '{}' CHECK (cardinality(made_up) <= 30),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ramadan_year)
);
ALTER TABLE public.fast_makeup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fast_makeup_own ON public.fast_makeup;
CREATE POLICY fast_makeup_own ON public.fast_makeup FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
