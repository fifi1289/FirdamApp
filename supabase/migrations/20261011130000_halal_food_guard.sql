-- Firdam is halal-only: the database refuses haram food in pantries, shopping
-- lists and family recipes, whichever app, AI feature or receipt scan sends it.
-- Uses the same rules as the app (public.recipe_haram_reason, generated from
-- supabase/functions/_shared/halal.ts). Re-runnable.

-- Why one food name is not halal, or null ("bacon" → pork; "halal turkey bacon" → null).
CREATE OR REPLACE FUNCTION public.haram_item_reason(item text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT public.recipe_haram_reason(ARRAY[coalesce(item, '')], '{}');
$$;

CREATE OR REPLACE FUNCTION public.reject_haram_food()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  why text;
BEGIN
  why := public.haram_item_reason(NEW.name);
  IF why IS NOT NULL THEN
    RAISE EXCEPTION 'Firdam only keeps halal food, so % can''t be added.', why
      USING ERRCODE = 'check_violation',
            HINT = 'Try a halal alternative, like halal turkey bacon, halal beef sausages or grape juice.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_haram_recipe()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  names text[];
  method text[];
  why text;
BEGIN
  SELECT coalesce(array_agg(coalesce(x ->> 'name', x #>> '{}')), '{}') INTO names
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(NEW.ingredients) = 'array' THEN NEW.ingredients ELSE '[]'::jsonb END) x;
  SELECT coalesce(array_agg(coalesce(x ->> 'instruction', x #>> '{}')), '{}') INTO method
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(NEW.steps) = 'array' THEN NEW.steps ELSE '[]'::jsonb END) x;
  why := public.recipe_haram_reason(array_append(names, NEW.name), method);
  IF why IS NOT NULL THEN
    RAISE EXCEPTION 'Firdam only shares halal recipes, so this recipe can''t be saved: %.', why
      USING ERRCODE = 'check_violation',
            HINT = 'Swap it for a halal alternative, like halal turkey bacon, grape juice or vanilla powder.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS halal_only ON public.pantry_items;
CREATE TRIGGER halal_only BEFORE INSERT OR UPDATE OF name ON public.pantry_items
  FOR EACH ROW EXECUTE FUNCTION public.reject_haram_food();

DROP TRIGGER IF EXISTS halal_only ON public.grocery_items;
CREATE TRIGGER halal_only BEFORE INSERT OR UPDATE OF name ON public.grocery_items
  FOR EACH ROW EXECUTE FUNCTION public.reject_haram_food();

DROP TRIGGER IF EXISTS halal_only ON public.user_recipes;
CREATE TRIGGER halal_only BEFORE INSERT OR UPDATE OF name, ingredients, steps ON public.user_recipes
  FOR EACH ROW EXECUTE FUNCTION public.reject_haram_recipe();
