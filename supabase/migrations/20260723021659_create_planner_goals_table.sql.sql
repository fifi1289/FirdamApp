/*
# Create planner_goals table

## Purpose
Stores long-term goals for the Planner module's Goals section. Each goal
belongs to an authenticated user and tracks progress toward an optional
target date. Goals can be created, edited, deleted, and marked completed.

## 1. New Tables
- `planner_goals`
  - `id` (uuid, primary key, defaults gen_random_uuid())
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users
    with ON DELETE CASCADE)
  - `title` (text, not null) — the goal title (required)
  - `description` (text, nullable) — optional longer description
  - `target_date` (date, nullable) — optional target completion date
  - `progress` (integer, not null, default 0) — 0-100 percentage
  - `completed` (boolean, not null, default false) — completed flag
  - `created_at` (timestamptz, not null, default now())
  - `updated_at` (timestamptz, not null, default now())

## 2. Security — Row Level Security
- RLS enabled on `planner_goals`.
- Four ownership-scoped policies (SELECT / INSERT / UPDATE / DELETE), each
  restricted to authenticated users who own the row (auth.uid() = user_id).
- `user_id` defaults to auth.uid() so client inserts that omit user_id
  still satisfy the INSERT WITH CHECK policy.

## 3. Indexes
- Index on (user_id, completed, created_at) for efficient listing of
  active goals on the Planner home.

## 4. Trigger
- `updated_at` auto-maintained via a BEFORE UPDATE trigger that sets
  updated_at = now() on every row update.

## 5. Idempotency
- Uses IF NOT EXISTS / DROP IF EXISTS so re-running is safe even if a
  prior apply_migration call timed out after committing server-side.
*/

CREATE TABLE IF NOT EXISTS public.planner_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  target_date  date,
  progress     integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planner_goals_select_own" ON public.planner_goals;
CREATE POLICY "planner_goals_select_own"
  ON public.planner_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_goals_insert_own" ON public.planner_goals;
CREATE POLICY "planner_goals_insert_own"
  ON public.planner_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_goals_update_own" ON public.planner_goals;
CREATE POLICY "planner_goals_update_own"
  ON public.planner_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_goals_delete_own" ON public.planner_goals;
CREATE POLICY "planner_goals_delete_own"
  ON public.planner_goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_planner_goals_user_status
  ON public.planner_goals (user_id, completed, created_at);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planner_goals_updated_at ON public.planner_goals;
CREATE TRIGGER trg_planner_goals_updated_at
  BEFORE UPDATE ON public.planner_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
