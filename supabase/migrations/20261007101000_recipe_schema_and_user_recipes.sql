/*
# Recipe schema, favourites and user recipes

## Recipe library tables
The Meal Planner's recipe tables were created directly in the Supabase
dashboard. This migration creates them only if they don't exist yet, so a
brand-new project gets the same structure. On an existing project these
statements do nothing.

## New tables
- `recipe_favorites`  recipes a user has saved (catalogue or own recipe)
- `user_recipes`      recipes users write themselves; private by default,
                      optionally shared with the community

## Security
Catalogue tables are read-only for signed-in users (see the earlier
"add_recipe_read_policies" migration; repeated here so new projects get it).
Favourites are private. User recipes are readable by their owner, or by
everyone when `is_public` is true.
*/

-- ── Catalogue (no-ops on existing projects) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.cuisines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.meal_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.difficulties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  halal boolean DEFAULT true,
  slug text,
  category_id uuid,
  default_unit text,
  pantry_trackable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  short_description text,
  long_description text,
  cuisine_id uuid REFERENCES public.cuisines(id),
  meal_type_id uuid REFERENCES public.meal_types(id),
  difficulty_id uuid REFERENCES public.difficulties(id),
  prep_time_minutes integer,
  cook_time_minutes integer,
  servings integer,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  fiber numeric,
  sugar numeric,
  sodium numeric,
  cholesterol numeric,
  image_path text,
  halal boolean DEFAULT true,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  storage_instructions text,
  reheating_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  quantity numeric,
  unit text,
  optional boolean DEFAULT false,
  display_order integer,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  instruction text NOT NULL,
  estimated_minutes integer,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recipe_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  tip text NOT NULL,
  display_order integer,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recipe_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  equipment text NOT NULL,
  display_order integer,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recipe_tags (
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
CREATE TABLE IF NOT EXISTS public.allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recipe_allergens (
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  allergen_id uuid NOT NULL REFERENCES public.allergens(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, allergen_id)
);
CREATE TABLE IF NOT EXISTS public.age_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_months integer,
  max_months integer,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recipe_age_groups (
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  age_group_id uuid NOT NULL REFERENCES public.age_groups(id) ON DELETE CASCADE,
  recommended boolean DEFAULT true,
  PRIMARY KEY (recipe_id, age_group_id)
);
CREATE TABLE IF NOT EXISTS public.recipe_adaptations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  age_group_id uuid NOT NULL REFERENCES public.age_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  adaptation_instructions text NOT NULL,
  created_at timestamptz DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['recipes', 'recipe_ingredients', 'recipe_steps', 'recipe_tips',
    'recipe_equipment', 'recipe_tags', 'recipe_allergens', 'recipe_age_groups',
    'recipe_adaptations', 'cuisines', 'meal_types', 'difficulties', 'ingredients', 'tags',
    'allergens', 'age_groups'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'read_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'read_' || t, t);
  END LOOP;
END $$;

-- ── Favourites ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recipe_favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_key  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_key)
);

ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recipe_favorites_select_own" ON public.recipe_favorites;
CREATE POLICY "recipe_favorites_select_own" ON public.recipe_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recipe_favorites_insert_own" ON public.recipe_favorites;
CREATE POLICY "recipe_favorites_insert_own" ON public.recipe_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "recipe_favorites_delete_own" ON public.recipe_favorites;
CREATE POLICY "recipe_favorites_delete_own" ON public.recipe_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── User recipes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_recipes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description   text CHECK (description IS NULL OR char_length(description) <= 500),
  cuisine       text,
  meal_type     text NOT NULL DEFAULT 'dinner' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  difficulty    text NOT NULL DEFAULT 'Easy' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  prep_minutes  integer NOT NULL DEFAULT 0 CHECK (prep_minutes >= 0),
  cook_minutes  integer NOT NULL DEFAULT 0 CHECK (cook_minutes >= 0),
  servings      integer NOT NULL DEFAULT 4 CHECK (servings BETWEEN 1 AND 50),
  ingredients   jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps         jsonb NOT NULL DEFAULT '[]'::jsonb,
  tips          text,
  image_url     text,
  is_public     boolean NOT NULL DEFAULT false,
  author_name   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_recipes_select" ON public.user_recipes;
CREATE POLICY "user_recipes_select" ON public.user_recipes
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_public);
DROP POLICY IF EXISTS "user_recipes_insert_own" ON public.user_recipes;
CREATE POLICY "user_recipes_insert_own" ON public.user_recipes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_recipes_update_own" ON public.user_recipes;
CREATE POLICY "user_recipes_update_own" ON public.user_recipes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_recipes_delete_own" ON public.user_recipes;
CREATE POLICY "user_recipes_delete_own" ON public.user_recipes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_recipes_public ON public.user_recipes (is_public, created_at DESC);
