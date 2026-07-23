/*
# Create pantry_items table

## Purpose
Stores household food inventory items for the Pantry module. Each item
belongs to an authenticated user and records what food they have on hand,
including quantity, unit, category, and an optional expiration date.

## 1. New Tables
- `pantry_items`
  - `id` (uuid, primary key, defaults gen_random_uuid())
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users
    with ON DELETE CASCADE) — owner of the item
  - `name` (text, not null) — item name (required)
  - `category` (text, not null, defaults 'Other') — food category
  - `quantity` (numeric, not null, defaults 1) — amount on hand
  - `unit` (text, not null, defaults 'Pieces') — unit of measurement
  - `expiration_date` (date, nullable) — optional expiration date
  - `notes` (text, nullable) — optional freeform notes
  - `created_at` (timestamptz, not null, default now())
  - `updated_at` (timestamptz, not null, default now())

## 2. Security — Row Level Security
- RLS enabled on `pantry_items`.
- Four ownership-scoped policies (SELECT / INSERT / UPDATE / DELETE), each
  restricted to authenticated users who own the row (auth.uid() = user_id).
- `user_id` defaults to auth.uid() so client inserts that omit user_id
  still satisfy the INSERT WITH CHECK policy.

## 3. Indexes
- Index on (user_id, created_at) for efficient listing queries.

## 4. Idempotency
- Uses IF NOT EXISTS / DROP IF EXISTS so re-running is safe even if a
  prior apply_migration call timed out after committing server-side.
*/

CREATE TABLE IF NOT EXISTS public.pantry_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        text NOT NULL DEFAULT 'Other',
  quantity        numeric NOT NULL DEFAULT 1,
  unit            text NOT NULL DEFAULT 'Pieces',
  expiration_date date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pantry_items_select_own" ON public.pantry_items;
CREATE POLICY "pantry_items_select_own"
  ON public.pantry_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "pantry_items_insert_own" ON public.pantry_items;
CREATE POLICY "pantry_items_insert_own"
  ON public.pantry_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pantry_items_update_own" ON public.pantry_items;
CREATE POLICY "pantry_items_update_own"
  ON public.pantry_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pantry_items_delete_own" ON public.pantry_items;
CREATE POLICY "pantry_items_delete_own"
  ON public.pantry_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_created
  ON public.pantry_items (user_id, created_at);
