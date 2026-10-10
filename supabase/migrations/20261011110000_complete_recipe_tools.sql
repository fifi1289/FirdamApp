-- Tools for filling in recipes that have a name and details but no ingredients
-- or method yet (used by the admin-only recipe-complete edge function).
-- Only the service role can call them. Re-runnable.

-- Recipes still missing ingredients, with what is known about each one.
CREATE OR REPLACE FUNCTION public.recipes_missing_ingredients(max_rows integer, skip_ids uuid[] DEFAULT '{}')
RETURNS TABLE (
  id uuid, name text, short_description text, cuisine text, meal_type text,
  servings integer, prep_time_minutes integer, cook_time_minutes integer, calories integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.short_description, c.name, m.name,
         r.servings::integer, r.prep_time_minutes::integer, r.cook_time_minutes::integer, r.calories::integer
  FROM public.recipes r
  LEFT JOIN public.cuisines c ON c.id = r.cuisine_id
  LEFT JOIN public.meal_types m ON m.id = r.meal_type_id
  WHERE r.is_active IS TRUE
    AND NOT EXISTS (SELECT 1 FROM public.recipe_ingredients ri WHERE ri.recipe_id = r.id)
    AND NOT (r.id = ANY (coalesce(skip_ids, '{}')))
  ORDER BY r.created_at, r.id
  LIMIT greatest(1, least(max_rows, 50));
$$;

CREATE OR REPLACE FUNCTION public.count_recipes_missing_ingredients()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM public.recipes r
  WHERE r.is_active IS TRUE
    AND NOT EXISTS (SELECT 1 FROM public.recipe_ingredients ri WHERE ri.recipe_id = r.id);
$$;

-- Saves one recipe's ingredients, method and allergen tags in a single step.
--   items: [{ "name": "basmati rice", "quantity": 300, "unit": "g", "optional": false, "notes": null }]
--   steps: [{ "instruction": "Rinse the rice…", "minutes": 5 }]
--   allergens: [["dairy", "milk", "lactose"], ["eggs", "egg"]] — each entry lists
--     the names one allergen may have in the allergens table (Milk vs Dairy).
-- Reuses existing ingredients by name (ignoring capitals). Does nothing if the
-- recipe already has ingredients, so it is safe to call twice.
DROP FUNCTION IF EXISTS public.complete_recipe(uuid, jsonb, jsonb);
CREATE OR REPLACE FUNCTION public.complete_recipe(target uuid, items jsonb, steps jsonb, allergens jsonb DEFAULT '[]')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb;
  st jsonb;
  al jsonb;
  al_id uuid;
  ing_id uuid;
  clean_name text;
  pos integer := 0;
  added integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = target) THEN
    RAISE EXCEPTION 'Recipe not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.recipe_ingredients WHERE recipe_id = target) THEN
    RETURN 0;
  END IF;
  IF jsonb_array_length(coalesce(items, '[]')) = 0 OR jsonb_array_length(coalesce(steps, '[]')) = 0 THEN
    RAISE EXCEPTION 'A recipe needs ingredients and steps';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    clean_name := lower(regexp_replace(trim(it ->> 'name'), '\s+', ' ', 'g'));
    CONTINUE WHEN clean_name IS NULL OR clean_name = '';
    SELECT i.id INTO ing_id FROM public.ingredients i WHERE lower(i.name) = clean_name ORDER BY i.created_at LIMIT 1;
    IF ing_id IS NULL THEN
      BEGIN
        INSERT INTO public.ingredients (name, slug, halal)
          VALUES (clean_name, trim(both '-' from regexp_replace(clean_name, '[^a-z0-9]+', '-', 'g')), true)
          RETURNING id INTO ing_id;
      EXCEPTION WHEN unique_violation THEN
        -- Another recipe added the same food a moment ago.
        SELECT i.id INTO ing_id FROM public.ingredients i WHERE lower(i.name) = clean_name ORDER BY i.created_at LIMIT 1;
      END;
    END IF;
    -- The same food twice in one recipe: keep the first.
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.recipe_ingredients WHERE recipe_id = target AND ingredient_id = ing_id);
    pos := pos + 1;
    INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, optional, display_order, notes)
      VALUES (
        target, ing_id,
        greatest(0, coalesce(nullif(it ->> 'quantity', '')::numeric, 0)),
        coalesce(nullif(trim(it ->> 'unit'), ''), 'to taste'),
        coalesce((it ->> 'optional')::boolean, false),
        pos,
        nullif(trim(it ->> 'notes'), '')
      );
    added := added + 1;
  END LOOP;

  -- A recipe without ingredients gets a fresh method too.
  DELETE FROM public.recipe_steps WHERE recipe_id = target;
  pos := 0;
  FOR st IN SELECT * FROM jsonb_array_elements(steps) LOOP
    CONTINUE WHEN nullif(trim(st ->> 'instruction'), '') IS NULL;
    pos := pos + 1;
    INSERT INTO public.recipe_steps (recipe_id, step_number, instruction, estimated_minutes)
      VALUES (target, pos, trim(st ->> 'instruction'), nullif(st ->> 'minutes', '')::integer);
  END LOOP;

  -- Tag allergens so "Safe for my family" can rely on tags as well as names.
  FOR al IN SELECT * FROM jsonb_array_elements(coalesce(allergens, '[]')) LOOP
    CONTINUE WHEN jsonb_typeof(al) <> 'array';
    SELECT a.id INTO al_id FROM public.allergens a
      WHERE lower(a.name) IN (SELECT lower(x) FROM jsonb_array_elements_text(al) x)
      ORDER BY a.name LIMIT 1;
    CONTINUE WHEN al_id IS NULL;
    INSERT INTO public.recipe_allergens (recipe_id, allergen_id)
      SELECT target, al_id
      WHERE NOT EXISTS (SELECT 1 FROM public.recipe_allergens WHERE recipe_id = target AND allergen_id = al_id);
  END LOOP;

  RETURN added;
END;
$$;

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.recipes_missing_ingredients(integer, uuid[])',
    'public.count_recipes_missing_ingredients()',
    'public.complete_recipe(uuid, jsonb, jsonb, jsonb)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', fn);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END IF;
  END LOOP;
END $$;
