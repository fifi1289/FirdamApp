-- Recipe library filler: remembers meal × cuisine × extras slots the AI could
-- not fill after a few tries, so the job moves on instead of looping.
CREATE TABLE IF NOT EXISTS public.recipe_fill_skips (
  key text PRIMARY KEY,
  tries integer NOT NULL DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_fill_skips ENABLE ROW LEVEL SECURITY;
-- Only the edge function (service role) reads and writes it.
REVOKE ALL ON public.recipe_fill_skips FROM anon, authenticated;
