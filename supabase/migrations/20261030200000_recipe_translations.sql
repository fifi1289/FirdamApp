-- Recipes in French and Arabic. English stays the master copy in recipes /
-- ingredients (pantry, shopping and allergy checks match on English names);
-- these tables hold the translations shown to French and Arabic families.
-- Same recipe, same photo, same id: only the words change.

-- Recipe text per language. steps/tips/equipment follow the English order.
CREATE TABLE IF NOT EXISTS public.recipe_translations (
  recipe_id     uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  lang          text NOT NULL CHECK (lang IN ('fr', 'ar')),
  name          text,
  short_description text,
  long_description  text,
  steps         text[] NOT NULL DEFAULT '{}',
  tips          text[] NOT NULL DEFAULT '{}',
  equipment     text[] NOT NULL DEFAULT '{}',
  storage_instructions   text,
  reheating_instructions text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_id, lang)
);

-- Food names by their English name (lower case), so one translation serves
-- recipes, the pantry and shopping lists alike: "chicken" → "poulet" / "دجاج".
CREATE TABLE IF NOT EXISTS public.food_translations (
  name_en    text NOT NULL CHECK (name_en = lower(name_en) AND length(name_en) BETWEEN 1 AND 120),
  lang       text NOT NULL CHECK (lang IN ('fr', 'ar')),
  name       text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (name_en, lang)
);

ALTER TABLE public.recipe_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_translations ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read; only the admin writes (the AI chef writes with
-- the service role, which isn't limited by these policies).
DROP POLICY IF EXISTS recipe_translations_read ON public.recipe_translations;
CREATE POLICY recipe_translations_read ON public.recipe_translations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS recipe_translations_admin ON public.recipe_translations;
CREATE POLICY recipe_translations_admin ON public.recipe_translations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS food_translations_read ON public.food_translations;
CREATE POLICY food_translations_read ON public.food_translations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS food_translations_admin ON public.food_translations;
CREATE POLICY food_translations_admin ON public.food_translations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Same two-step-verification rule as every other table.
DROP POLICY IF EXISTS require_2fa_when_enabled ON public.recipe_translations;
CREATE POLICY require_2fa_when_enabled ON public.recipe_translations AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.mfa_satisfied()) WITH CHECK (public.mfa_satisfied());
DROP POLICY IF EXISTS require_2fa_when_enabled ON public.food_translations;
CREATE POLICY require_2fa_when_enabled ON public.food_translations AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.mfa_satisfied()) WITH CHECK (public.mfa_satisfied());

-- Saves translations from a JSON batch (used to load the existing library):
-- [{"recipe_id": "...", "lang": "fr", "name": "...", ...}]. Admin only.
CREATE OR REPLACE FUNCTION public.save_recipe_translations(rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  -- current_user is always the owner inside SECURITY DEFINER, so check who is
  -- really calling: the admin, the AI chef (service role), or a direct database
  -- session (SQL Editor). Signed-in families come through 'authenticator'.
  IF NOT (public.is_admin() OR coalesce(auth.role(), '') = 'service_role' OR session_user <> 'authenticator') THEN
    RAISE EXCEPTION 'Only the Firdam admin can save translations.';
  END IF;
  INSERT INTO public.recipe_translations AS t (recipe_id, lang, name, short_description, long_description, steps, tips, equipment, storage_instructions, reheating_instructions, updated_at)
  SELECT (r->>'recipe_id')::uuid, r->>'lang', r->>'name', r->>'short_description', r->>'long_description',
         COALESCE(ARRAY(SELECT jsonb_array_elements_text(r->'steps')), '{}'),
         COALESCE(ARRAY(SELECT jsonb_array_elements_text(r->'tips')), '{}'),
         COALESCE(ARRAY(SELECT jsonb_array_elements_text(r->'equipment')), '{}'),
         r->>'storage_instructions', r->>'reheating_instructions', now()
  FROM jsonb_array_elements(rows) r
  WHERE EXISTS (SELECT 1 FROM public.recipes WHERE id = (r->>'recipe_id')::uuid)
  ON CONFLICT (recipe_id, lang) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, t.name),
    short_description = COALESCE(EXCLUDED.short_description, t.short_description),
    long_description = COALESCE(EXCLUDED.long_description, t.long_description),
    steps = CASE WHEN cardinality(EXCLUDED.steps) > 0 THEN EXCLUDED.steps ELSE t.steps END,
    tips = CASE WHEN cardinality(EXCLUDED.tips) > 0 THEN EXCLUDED.tips ELSE t.tips END,
    equipment = CASE WHEN cardinality(EXCLUDED.equipment) > 0 THEN EXCLUDED.equipment ELSE t.equipment END,
    storage_instructions = COALESCE(EXCLUDED.storage_instructions, t.storage_instructions),
    reheating_instructions = COALESCE(EXCLUDED.reheating_instructions, t.reheating_instructions),
    updated_at = now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.save_recipe_translations(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_recipe_translations(jsonb) TO authenticated, service_role;

-- Same for food names: [{"name_en": "chicken", "lang": "ar", "name": "دجاج"}].
CREATE OR REPLACE FUNCTION public.save_food_translations(rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  -- current_user is always the owner inside SECURITY DEFINER, so check who is
  -- really calling: the admin, the AI chef (service role), or a direct database
  -- session (SQL Editor). Signed-in families come through 'authenticator'.
  IF NOT (public.is_admin() OR coalesce(auth.role(), '') = 'service_role' OR session_user <> 'authenticator') THEN
    RAISE EXCEPTION 'Only the Firdam admin can save translations.';
  END IF;
  INSERT INTO public.food_translations AS t (name_en, lang, name, updated_at)
  SELECT lower(trim(r->>'name_en')), r->>'lang', trim(r->>'name'), now()
  FROM jsonb_array_elements(rows) r
  WHERE coalesce(trim(r->>'name'), '') <> ''
  ON CONFLICT (name_en, lang) DO UPDATE SET name = EXCLUDED.name, updated_at = now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.save_food_translations(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_food_translations(jsonb) TO authenticated, service_role;
