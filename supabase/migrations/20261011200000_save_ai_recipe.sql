-- Recipes written by the AI chef join the recipe library, so the library grows
-- with every plan and swap. Only the meal-plan function (service role) calls
-- this. Each recipe is halal-checked first; a recipe with the same name already
-- in the library is reused instead of duplicated. Re-runnable.

ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'library';

CREATE OR REPLACE FUNCTION public.save_ai_recipe(meal jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r_name text := left(trim(meal ->> 'name'), 160);
  r_id uuid;
  c_id uuid;
  m_id uuid;
  d_id uuid;
  ing_names text[];
  step_texts text[];
  items jsonb;
  steps jsonb;
  base_slug text;
BEGIN
  IF r_name IS NULL OR r_name = '' THEN RETURN NULL; END IF;

  SELECT coalesce(array_agg(x ->> 'name'), '{}') INTO ing_names FROM jsonb_array_elements(coalesce(meal -> 'ingredients', '[]')) x;
  SELECT coalesce(array_agg(x #>> '{}'), '{}') INTO step_texts FROM jsonb_array_elements(coalesce(meal -> 'recipe', '[]')) x;
  IF cardinality(ing_names) = 0 OR cardinality(step_texts) = 0 THEN RETURN NULL; END IF;
  IF public.recipe_haram_reason(ing_names, step_texts) IS NOT NULL THEN RETURN NULL; END IF;

  -- Same dish already in the library: use it.
  SELECT id INTO r_id FROM public.recipes WHERE lower(name) = lower(r_name) AND is_active ORDER BY created_at LIMIT 1;
  IF r_id IS NOT NULL THEN RETURN r_id; END IF;

  SELECT id INTO c_id FROM public.cuisines WHERE lower(name) = lower(trim(meal ->> 'cuisine')) LIMIT 1;
  IF c_id IS NULL AND coalesce(trim(meal ->> 'cuisine'), '') <> '' THEN
    BEGIN
      INSERT INTO public.cuisines (name, slug)
        VALUES (initcap(trim(meal ->> 'cuisine')), trim(both '-' from regexp_replace(lower(trim(meal ->> 'cuisine')), '[^a-z0-9]+', '-', 'g')))
        RETURNING id INTO c_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO c_id FROM public.cuisines WHERE lower(name) = lower(trim(meal ->> 'cuisine')) LIMIT 1;
    END;
  END IF;
  IF c_id IS NULL THEN SELECT id INTO c_id FROM public.cuisines ORDER BY name LIMIT 1; END IF;

  SELECT id INTO m_id FROM public.meal_types WHERE lower(name) = lower(trim(meal ->> 'type')) LIMIT 1;
  IF m_id IS NULL THEN SELECT id INTO m_id FROM public.meal_types WHERE lower(name) = 'dinner' LIMIT 1; END IF;
  SELECT id INTO d_id FROM public.difficulties WHERE lower(name) = lower(trim(meal ->> 'difficulty')) LIMIT 1;

  base_slug := trim(both '-' from regexp_replace(lower(r_name), '[^a-z0-9]+', '-', 'g'));
  INSERT INTO public.recipes (name, slug, short_description, cuisine_id, meal_type_id, difficulty_id,
                              prep_time_minutes, cook_time_minutes, servings, halal, is_active, source)
  VALUES (
    r_name,
    left(base_slug, 70) || '-' || substr(md5(random()::text), 1, 6),
    left(nullif(trim(meal ->> 'description'), ''), 400),
    c_id, m_id, d_id,
    CASE WHEN (meal ->> 'prepTime') ~ '^\d+$' THEN (meal ->> 'prepTime')::int END,
    CASE WHEN (meal ->> 'cookTime') ~ '^\d+$' THEN (meal ->> 'cookTime')::int END,
    greatest(1, CASE WHEN (meal ->> 'servings') ~ '^\d+(\.\d+)?$' THEN round((meal ->> 'servings')::numeric)::int ELSE 4 END),
    true, true, 'ai'
  )
  RETURNING id INTO r_id;

  -- Quantities like "1/2" or "2-3" become numbers; anything else "to taste".
  SELECT jsonb_agg(jsonb_build_object(
           'name', x ->> 'name',
           'unit', x ->> 'unit',
           'quantity', CASE
             WHEN trim(x ->> 'quantity') ~ '^\d+(\.\d+)?$' THEN trim(x ->> 'quantity')
             WHEN trim(x ->> 'quantity') ~ '^\d+/\d+$' THEN round(split_part(trim(x ->> 'quantity'), '/', 1)::numeric / nullif(split_part(trim(x ->> 'quantity'), '/', 2)::numeric, 0), 2)::text
             WHEN trim(x ->> 'quantity') ~ '^\d+(\.\d+)?\s*-\s*\d+' THEN substring(trim(x ->> 'quantity') from '^\d+(?:\.\d+)?')
             ELSE '' END))
    INTO items FROM jsonb_array_elements(meal -> 'ingredients') x;
  SELECT jsonb_agg(jsonb_build_object('instruction', s)) INTO steps FROM unnest(step_texts) s;
  PERFORM public.complete_recipe(r_id, items, steps, '[]'::jsonb);
  RETURN r_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'save_ai_recipe(%): %', r_name, SQLERRM;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.save_ai_recipe(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_ai_recipe(jsonb) TO service_role;
