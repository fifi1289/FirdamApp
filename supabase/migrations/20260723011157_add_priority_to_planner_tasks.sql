/*
# Add priority to planner_tasks

## Purpose
Introduce a Priority system for Planner tasks. Each task can be marked
High, Medium, or Low priority. The Planner UI limits each day to at most
three High-priority tasks.

## 1. Modified Tables
- `planner_tasks`
  - Add `priority` (text, not null, default 'medium') — one of
    'high', 'medium', 'low'. A CHECK constraint enforces the allowed
    values. Existing rows default to 'medium' so no data is lost.

## 2. Security
- No policy changes — existing owner-scoped RLS policies already cover
  the new column (they apply to whole rows, not individual columns).

## 3. Idempotency
- Uses DO $$ ... IF NOT EXISTS ... END $$ so re-running is safe even if
  a prior apply_migration call timed out after committing server-side.
  The CHECK constraint is dropped-if-exists before recreate so a
  re-run does not raise a duplicate-constraint error.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planner_tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.planner_tasks ADD COLUMN priority text NOT NULL DEFAULT 'medium';
  END IF;
END $$;

ALTER TABLE public.planner_tasks DROP CONSTRAINT IF EXISTS planner_tasks_priority_check;
ALTER TABLE public.planner_tasks
  ADD CONSTRAINT planner_tasks_priority_check
  CHECK (priority IN ('high', 'medium', 'low'));
