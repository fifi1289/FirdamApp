-- The library's "Moroccan Shakshuka" had ingredients but no method, so the app
-- hid it. Adds the steps if they are still missing. Re-runnable.
INSERT INTO public.recipe_steps (recipe_id, step_number, instruction, estimated_minutes)
SELECT r.id, v.n, v.txt, v.mins
FROM public.recipes r
CROSS JOIN (VALUES
  (1, 'Warm the olive oil in a frying pan and soften the sliced red pepper for 5 minutes.', 5),
  (2, 'Add the garlic and cumin and cook for 1 minute until fragrant.', 1),
  (3, 'Add the chopped tomatoes with the salt and pepper and simmer for 10 minutes until thick.', 10),
  (4, 'Make four hollows in the sauce, crack in the eggs, cover and cook for 5 to 6 minutes until the whites are set.', 6),
  (5, 'Serve straight from the pan with bread.', NULL::integer)
) AS v(n, txt, mins)
WHERE r.name = 'Moroccan Shakshuka'
  AND NOT EXISTS (SELECT 1 FROM public.recipe_steps s WHERE s.recipe_id = r.id);
