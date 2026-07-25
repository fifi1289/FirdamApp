/*
# Add read policies for recipe and lookup tables

1. Purpose
- The Recipe Details page loads a recipe and all its related data
  (ingredients, steps, tips, equipment, tags, allergens, age groups,
  adaptations) plus the lookup tables that resolve foreign-key IDs into
  human-readable names (cuisines, meal_types, difficulties, ingredients,
  tags, allergens, age_groups).
- RLS is already enabled on every recipe_* table and on `recipes`, but no
  SELECT policy exists on any of them, so the browser client (anon key /
  authenticated session) currently reads zero rows.
- These tables hold shared reference/recipe content — they are NOT
  user-owned data. We add read-only SELECT policies so signed-in users can
  view recipes. No INSERT/UPDATE/DELETE policies are added here.

2. Tables receiving a SELECT policy (TO authenticated)
- recipes
- recipe_ingredients
- recipe_steps
- recipe_tips
- recipe_equipment
- recipe_tags
- recipe_allergens
- recipe_age_groups
- recipe_adaptations
- cuisines
- meal_types
- difficulties
- ingredients
- tags
- allergens
- age_groups

3. Security
- Read-only: only SELECT policies are created.
- Scoped to authenticated users (the app has a sign-in screen).
- No write policies are introduced, so the tables remain write-locked
  except for the service role / migrations.

4. Idempotency
- Each policy is dropped before creation so the migration is safe to re-run.
*/

-- Recipes + related child tables
DROP POLICY IF EXISTS "read_recipes" ON recipes;
CREATE POLICY "read_recipes" ON recipes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_recipe_ingredients" ON recipe_ingredients;
CREATE POLICY "read_recipe_ingredients" ON recipe_ingredients
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_recipe_steps" ON recipe_steps;
CREATE POLICY "read_recipe_steps" ON recipe_steps
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_recipe_tips" ON recipe_tips;
CREATE POLICY "read_recipe_tips" ON recipe_tips
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_recipe_equipment" ON recipe_equipment;
CREATE POLICY "read_recipe_equipment" ON recipe_equipment
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_recipe_tags" ON recipe_tags;
CREATE POLICY "read_recipe_tags" ON recipe_tags
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_recipe_allergens" ON recipe_allergens;
CREATE POLICY "read_recipe_allergens" ON recipe_allergens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_recipe_age_groups" ON recipe_age_groups;
CREATE POLICY "read_recipe_age_groups" ON recipe_age_groups
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_recipe_adaptations" ON recipe_adaptations;
CREATE POLICY "read_recipe_adaptations" ON recipe_adaptations
  FOR SELECT TO authenticated USING (true);

-- Lookup tables
DROP POLICY IF EXISTS "read_cuisines" ON cuisines;
CREATE POLICY "read_cuisines" ON cuisines
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_meal_types" ON meal_types;
CREATE POLICY "read_meal_types" ON meal_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_difficulties" ON difficulties;
CREATE POLICY "read_difficulties" ON difficulties
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_ingredients" ON ingredients;
CREATE POLICY "read_ingredients" ON ingredients
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_tags" ON tags;
CREATE POLICY "read_tags" ON tags
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_allergens" ON allergens;
CREATE POLICY "read_allergens" ON allergens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_age_groups" ON age_groups;
CREATE POLICY "read_age_groups" ON age_groups
  FOR SELECT TO authenticated USING (true);
