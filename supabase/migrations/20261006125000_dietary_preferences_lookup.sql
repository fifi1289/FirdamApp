/*
# Dietary preferences lookup

The Meal Planner reads its dietary options from `dietary_preferences`.
This makes sure the table exists, has sensible options, and is readable
by signed-in users. Safe to run on a project where it already exists.
*/

CREATE TABLE IF NOT EXISTS public.dietary_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO public.dietary_preferences (name)
SELECT v.name
FROM (VALUES
  ('Vegetarian'),
  ('Pescatarian'),
  ('Gluten-free'),
  ('Dairy-free'),
  ('Low-carb'),
  ('High-protein'),
  ('Kid-friendly')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.dietary_preferences d WHERE lower(d.name) = lower(v.name)
);

ALTER TABLE public.dietary_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_dietary_preferences" ON public.dietary_preferences;
CREATE POLICY "read_dietary_preferences" ON public.dietary_preferences
  FOR SELECT TO authenticated USING (true);
