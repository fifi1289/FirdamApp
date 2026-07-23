/*
# Create meal_plans table

## Summary
Adds a per-user table to store generated meal plans so they appear in the
"Recent Meal Plans" section and can be revisited. One row per saved plan.

## New Tables
- `meal_plans`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to the authenticated user, references auth.users with cascade delete)
  - `name` (text, not null, default 'Meal Plan') — display name for the saved plan
  - `plan_data` (jsonb, not null) — the full generated plan (days + meals)
  - `preferences` (jsonb, not null) — snapshot of preferences used to generate the plan
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)

## Security
- Enable RLS on `meal_plans`.
- Owner-scoped CRUD: each authenticated user can only access their own saved plans.

## Important Notes
1. Owner column defaults to auth.uid() so inserts without explicit user_id succeed.
2. plan_data and preferences are stored as JSONB since the plan is always loaded as a unit.
*/
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Meal Plan',
  plan_data jsonb NOT NULL,
  preferences jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meal_plans" ON meal_plans;
CREATE POLICY "select_own_meal_plans" ON meal_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_meal_plans" ON meal_plans;
CREATE POLICY "insert_own_meal_plans" ON meal_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_meal_plans" ON meal_plans;
CREATE POLICY "update_own_meal_plans" ON meal_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_meal_plans" ON meal_plans;
CREATE POLICY "delete_own_meal_plans" ON meal_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);