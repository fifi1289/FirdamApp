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

-- Admins can set a recipe's photo from the admin page.
DROP POLICY IF EXISTS "recipes_admin_update" ON public.recipes;
CREATE POLICY "recipes_admin_update" ON public.recipes
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admins can upload photos to the recipe-images bucket (everyone can view them).
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "recipe_images_admin_insert" ON storage.objects;
    CREATE POLICY "recipe_images_admin_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recipe-images' AND public.is_admin());
    DROP POLICY IF EXISTS "recipe_images_admin_update" ON storage.objects;
    CREATE POLICY "recipe_images_admin_update" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'recipe-images' AND public.is_admin());
    DROP POLICY IF EXISTS "recipe_images_admin_delete" ON storage.objects;
    CREATE POLICY "recipe_images_admin_delete" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'recipe-images' AND public.is_admin());
  END IF;
END $$;
