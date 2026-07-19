/*
# Create planner_tasks table

## Purpose
Stores individual tasks for the Planner module. Each task belongs to an
authenticated user and is scheduled for a specific date. The Today tab
in the Planner shows tasks scheduled for the current date.

## 1. New Tables
- `planner_tasks`
  - `id` (uuid, primary key, defaults gen_random_uuid())
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users
    with ON DELETE CASCADE)
  - `title` (text, not null) — the task title
  - `time` (time, nullable) — optional time of day for the task
  - `scheduled_date` (date, not null, defaults to CURRENT_DATE)
  - `completed` (boolean, not null, default false)
  - `created_at` (timestamptz, not null, default now())

## 2. Security — Row Level Security
- RLS enabled on `planner_tasks`.
- Four ownership-scoped policies (SELECT / INSERT / UPDATE / DELETE), each
  restricted to authenticated users who own the row (auth.uid() = user_id).
- `user_id` defaults to auth.uid() so client inserts that omit user_id
  still satisfy the INSERT WITH CHECK policy.

## 3. Indexes
- Index on (user_id, scheduled_date) for efficient Today-tab queries.

## 4. Idempotency
- Uses IF NOT EXISTS / DROP IF EXISTS so re-running is safe even if a
  prior apply_migration call timed out after committing server-side.
*/

CREATE TABLE IF NOT EXISTS public.planner_tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text NOT NULL,
  time           time,
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  completed      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planner_tasks_select_own" ON public.planner_tasks;
CREATE POLICY "planner_tasks_select_own"
  ON public.planner_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_tasks_insert_own" ON public.planner_tasks;
CREATE POLICY "planner_tasks_insert_own"
  ON public.planner_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_tasks_update_own" ON public.planner_tasks;
CREATE POLICY "planner_tasks_update_own"
  ON public.planner_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_tasks_delete_own" ON public.planner_tasks;
CREATE POLICY "planner_tasks_delete_own"
  ON public.planner_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_date
  ON public.planner_tasks (user_id, scheduled_date);
