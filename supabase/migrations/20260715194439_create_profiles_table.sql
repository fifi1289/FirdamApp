/*
# Create profiles table linked to auth.users

## Purpose
Stores the public profile for every Firdam user. One row per auth user,
created automatically on signup via a database trigger. This is the
foundation for the authentication system (TASK-003).

## 1. New Tables
- `profiles`
  - `id` (uuid, primary key) — matches auth.users.id, 1:1 relationship.
  - `first_name` (text) — given name, optional at signup.
  - `last_name`  (text) — family name, optional at signup.
  - `email`      (text, not null) — denormalized from auth.users for fast reads.
  - `avatar_url` (text) — optional profile picture URL.
  - `created_at` (timestamptz, default now()).
  - `updated_at` (timestamptz, default now(), maintained by trigger).

## 2. Modified Tables
- `auth.users` — no structural change; only referenced via foreign key.

## 3. Security — Row Level Security
- RLS enabled on `profiles`.
- Four ownership-scoped policies (SELECT/INSERT/UPDATE/DELETE), each
  restricted to `authenticated` users who own the row (`auth.uid() = id`).
- A user can only ever read or modify their own profile.

## 4. Automation
- `handle_new_user()` trigger function: on a new auth.users row, inserts a
  matching `profiles` row pulling first/last name from raw_user_meta_data
  and email from the auth record.
- Trigger fires AFTER INSERT on `auth.users`.
- `handle_updated_at()` + trigger keep `updated_at` fresh on every update.

## 5. Idempotency
- Uses IF NOT EXISTS / DROP IF EXISTS so re-running is safe even if a prior
  apply_migration call timed out after committing server-side.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  text,
  last_name   text,
  email       text NOT NULL,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies so this migration is safe to re-run.
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own"  ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- updated_at maintenance trigger -----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- auto-create a profile row on signup ------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
