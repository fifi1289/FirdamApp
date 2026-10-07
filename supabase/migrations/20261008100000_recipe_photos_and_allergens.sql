/*
# Recipe photos and allergens

- `recipes.image_prompt`: a short description of how the finished dish looks,
  used by the admin "Generate recipe photos" tool.
- Storage bucket `recipe-images` (public read) for the generated photos.
  Photos are uploaded by the `recipe-images` edge function with the service
  role, so no upload policies are needed for users.

The allergen and diet-tag rows themselves are added by the recipe library
seed that follows this migration.
*/

ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS image_prompt text;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('recipe-images', 'recipe-images', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  END IF;
END $$;
