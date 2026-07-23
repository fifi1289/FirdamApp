/*
# Create meal_preferences table

## Summary
Adds a per-user table to store meal planning preferences collected before
generating a meal plan. One row per user (unique user_id).

## New Tables
- `meal_preferences`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to the authenticated user, references auth.users with cascade delete)
  - `planning_duration` (int, not null, default 7) — number of days to plan meals for (3, 5, or 7)
  - `meal_types` (text[], not null, default '{breakfast,lunch,dinner}') — which meal types are enabled
  - `use_pantry_first` (boolean, not null, default false) — whether to prioritize pantry ingredients
  - `dietary_preferences` (text[], not null, default '{Halal}') — selected dietary preferences
  - `allergies` (text[], not null, default '{}') — list of allergy tags
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)

## Security
- Enable RLS on `meal_preferences`.
- Owner-scoped CRUD: each authenticated user can only access their own preference row.
- Unique constraint on `user_id` ensures one preference row per user (enables upsert).

## Important Notes
1. Owner column defaults to auth.uid() so inserts without explicit user_id succeed.
2. Unique index on user_id allows upsert via onConflict: 'user_id'.
3. Halal is enabled by default in dietary_preferences, matching the UI default.
*/

CREATE TABLE IF NOT EXISTS meal_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  planning_duration int NOT NULL DEFAULT 7,
  meal_types text[] NOT NULL DEFAULT '{breakfast,lunch,dinner}',
  use_pantry_first boolean NOT NULL DEFAULT false,
  dietary_preferences text[] NOT NULL DEFAULT '{Halal}',
  allergies text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meal_preferences ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS meal_preferences_user_id_key ON meal_preferences(user_id);

DROP POLICY IF EXISTS "select_own_meal_preferences" ON meal_preferences;
CREATE POLICY "select_own_meal_preferences" ON meal_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_meal_preferences" ON meal_preferences;
CREATE POLICY "insert_own_meal_preferences" ON meal_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_meal_preferences" ON meal_preferences;
CREATE POLICY "update_own_meal_preferences" ON meal_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_meal_preferences" ON meal_preferences;
CREATE POLICY "delete_own_meal_preferences" ON meal_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);