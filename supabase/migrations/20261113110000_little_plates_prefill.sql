-- Little Plates are written ahead of time for every library recipe (by the
-- little-plates function's "fill" action on a schedule), so families never
-- start an AI call by opening a little one's plate.
-- Library recipes (shown, with a photo) still missing a guide for some stage.
CREATE OR REPLACE FUNCTION public.little_plates_todo(p_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM (
    SELECT r.id, r.name,
      (SELECT array_agg(s) FROM unnest(ARRAY['baby','little','toddler']) s
        WHERE NOT EXISTS (SELECT 1 FROM little_plates lp WHERE lp.recipe_key = r.id::text AND lp.stage = s)) AS stages,
      (SELECT coalesce(array_agg(i.name ORDER BY ri.display_order), '{}') FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id WHERE ri.recipe_id = r.id) AS ingredients,
      (SELECT coalesce(array_agg(st.instruction ORDER BY st.step_number), '{}') FROM recipe_steps st WHERE st.recipe_id = r.id) AS steps
    FROM recipes r
    WHERE r.is_active AND r.image_path IS NOT NULL
      AND (SELECT count(*) FROM little_plates lp WHERE lp.recipe_key = r.id::text) < 3
    ORDER BY r.is_featured DESC NULLS LAST, r.created_at
    LIMIT greatest(1, least(p_limit, 10))
  ) t;
$$;
REVOKE ALL ON FUNCTION public.little_plates_todo(integer) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.little_plates_remaining()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum(3 - (SELECT count(*) FROM little_plates lp WHERE lp.recipe_key = r.id::text)), 0)::int
  FROM recipes r WHERE r.is_active AND r.image_path IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.little_plates_remaining() FROM public, anon, authenticated;
