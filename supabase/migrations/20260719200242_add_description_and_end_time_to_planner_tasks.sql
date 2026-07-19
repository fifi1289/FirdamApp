/*
# Add description and end_time to planner_tasks

## Purpose
Enhance the Planner task creation dialog with an optional description,
a selectable date (already supported via scheduled_date), an optional
start time (existing `time` column), and an optional end time.

## 1. Modified Tables
- `planner_tasks`
  - Add `description` (text, nullable) — optional task description.
  - Add `end_time` (time, nullable) — optional end time of day.

## 2. Security
- No policy changes — existing owner-scoped RLS policies already cover
  the new columns (they apply to whole rows, not individual columns).

## 3. Idempotency
- Uses DO $$ ... IF NOT EXISTS ... END $$ so re-running is safe even if
  a prior apply_migration call timed out after committing server-side.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planner_tasks' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.planner_tasks ADD COLUMN description text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planner_tasks' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE public.planner_tasks ADD COLUMN end_time time;
  END IF;
END $$;
