-- Family recipes are private: only the family that added them can see them.
UPDATE public.user_recipes SET is_public = false WHERE is_public;
ALTER TABLE public.user_recipes DROP CONSTRAINT IF EXISTS user_recipes_private_only;
ALTER TABLE public.user_recipes ADD CONSTRAINT user_recipes_private_only CHECK (is_public = false);
ALTER POLICY "user_recipes_select" ON public.user_recipes USING (auth.uid() = user_id);
