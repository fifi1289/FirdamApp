/*
# Grocery lists

## Purpose
Backs the Groceries module: named shopping lists with items that can be
filled from the latest meal plan (minus what is already in the pantry),
checked off in the store, and moved into the pantry afterwards.

## Tables
- `grocery_lists`  a user's lists (e.g. "Weekly groceries", "Eid shopping")
- `grocery_items`  items on a list, with quantity, unit and category

## Security
RLS on both tables; every policy is scoped to the owner (auth.uid() = user_id).
`user_id` defaults to auth.uid() so client inserts can omit it.
*/

CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  store_name  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grocery_lists_select_own" ON public.grocery_lists;
CREATE POLICY "grocery_lists_select_own" ON public.grocery_lists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "grocery_lists_insert_own" ON public.grocery_lists;
CREATE POLICY "grocery_lists_insert_own" ON public.grocery_lists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "grocery_lists_update_own" ON public.grocery_lists;
CREATE POLICY "grocery_lists_update_own" ON public.grocery_lists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "grocery_lists_delete_own" ON public.grocery_lists;
CREATE POLICY "grocery_lists_delete_own" ON public.grocery_lists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_grocery_lists_user ON public.grocery_lists (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.grocery_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id         uuid NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  name            text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  quantity        numeric,
  unit            text,
  category        text NOT NULL DEFAULT 'Other',
  checked         boolean NOT NULL DEFAULT false,
  note            text,
  from_meal_plan  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grocery_items_select_own" ON public.grocery_items;
CREATE POLICY "grocery_items_select_own" ON public.grocery_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "grocery_items_insert_own" ON public.grocery_items;
CREATE POLICY "grocery_items_insert_own" ON public.grocery_items
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.grocery_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "grocery_items_update_own" ON public.grocery_items;
CREATE POLICY "grocery_items_update_own" ON public.grocery_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "grocery_items_delete_own" ON public.grocery_items;
CREATE POLICY "grocery_items_delete_own" ON public.grocery_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_grocery_items_list ON public.grocery_items (list_id, created_at);
