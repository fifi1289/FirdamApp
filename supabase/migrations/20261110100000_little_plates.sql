-- Little Plates: "how to make it" guides for baby and toddler versions of family
-- meals, written once per recipe and stage by the little-plates function and
-- shared by every family. The safety changes themselves are fixed rules in the app.
CREATE TABLE IF NOT EXISTS public.little_plates (
  recipe_key text NOT NULL CHECK (char_length(recipe_key) BETWEEN 1 AND 120),
  stage      text NOT NULL CHECK (stage IN ('baby', 'little', 'toddler')),
  name       text,
  guide      jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_key, stage)
);
ALTER TABLE public.little_plates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS little_plates_read ON public.little_plates;
CREATE POLICY little_plates_read ON public.little_plates FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.little_plates TO authenticated;
