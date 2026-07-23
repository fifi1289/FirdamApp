/*
# Create family_members table

1. Purpose
   Stores household members for the Family module. Each member belongs to the
   signed-in user who created it (owner-scoped via user_id).

2. New Tables
   - `family_members`
     - `id` (uuid, primary key, auto-generated)
     - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users with ON DELETE CASCADE)
     - `first_name` (text, not null) — the member's first name
     - `relationship` (text, not null) — one of: Self, Spouse, Son, Daughter,
       Father, Mother, Brother, Sister, Grandfather, Grandmother, Other
     - `birth_date` (date, nullable) — optional birth date for automatic age calc
     - `notes` (text, nullable) — optional freeform notes
     - `created_at` (timestamptz, defaults to now())
     - `updated_at` (timestamptz, defaults to now())

3. Indexes
   - `family_members_user_id_idx` on `user_id` for fast per-user listing.

4. Security (RLS)
   - Enable RLS on `family_members`.
   - Owner-scoped CRUD: each authenticated user can only access rows they own.
     - select_own_family_members  (SELECT)
     - insert_own_family_members  (INSERT, WITH CHECK)
     - update_own_family_members  (UPDATE, USING + WITH CHECK)
     - delete_own_family_members  (DELETE, USING)

5. Notes
   - `user_id` defaults to auth.uid() so frontend inserts that omit user_id
     still satisfy the INSERT WITH CHECK policy.
   - No destructive operations; idempotent (IF NOT EXISTS, DROP POLICY IF EXISTS).
*/

CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  relationship text NOT NULL,
  birth_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_members_user_id_idx ON family_members(user_id);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_family_members" ON family_members;
CREATE POLICY "select_own_family_members" ON family_members FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_family_members" ON family_members;
CREATE POLICY "insert_own_family_members" ON family_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_family_members" ON family_members;
CREATE POLICY "update_own_family_members" ON family_members FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_family_members" ON family_members;
CREATE POLICY "delete_own_family_members" ON family_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
