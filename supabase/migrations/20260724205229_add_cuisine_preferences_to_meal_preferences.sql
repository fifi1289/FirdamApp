/*
# Add cuisine preferences to meal_preferences

## Summary
Adds a new `cuisine_preferences` column to the `meal_preferences` table so each
meal type (Breakfast, Lunch, Dinner, Snack) can have its own list of preferred
cuisines. When a user generates a meal plan, the generator uses these selections
to pick meals only from the chosen cuisines for each meal type; if no cuisines
are selected for a meal type, the generator may use all cuisines.

## Modified Tables
- `meal_preferences`
  - `cuisine_preferences` (jsonb, not null, default '{}'::jsonb) — a map of
    meal type -> array of cuisine names, e.g.
    `{"breakfast": ["Moroccan", "Mediterranean"], "lunch": ["Italian"]}`.
    An empty array (or missing key) means "all cuisines" for that meal type.

## Security
- No changes to existing RLS policies. The column is readable/writable by the
  owning user through the existing owner-scoped SELECT/INSERT/UPDATE/DELETE
  policies already defined on `meal_preferences`.

## Important Notes
1. The column uses jsonb (not text[]) because each meal type maps to its own
   array — a single flat array cannot express that structure.
2. The default `'{}'::jsonb` means existing rows have no cuisine restrictions,
   preserving current generation behavior.
3. The migration is idempotent: the DO block checks for the column before
   adding it, so re-running is safe.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_preferences'
      AND column_name = 'cuisine_preferences'
  ) THEN
    ALTER TABLE meal_preferences
      ADD COLUMN cuisine_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;
