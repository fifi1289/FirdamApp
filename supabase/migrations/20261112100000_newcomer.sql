-- Newcomer: a family's first-year plan in a new country (Canada first).
-- One plan per family (shared like the pantry and meal plans), plus one row per
-- step the family has assigned or finished. The steps themselves live in the
-- app's shared content (features/newcomer), not in the database.

CREATE TABLE IF NOT EXISTS public.newcomer_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  country text NOT NULL DEFAULT 'CA' CHECK (country ~ '^[A-Z]{2}$'),
  region text CHECK (region IS NULL OR region ~ '^[A-Z]{2}$'),
  city text CHECK (city IS NULL OR length(city) <= 80),
  status text NOT NULL CHECK (status IN ('pr', 'work', 'study', 'refugee', 'sponsor')),
  arrival_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_newcomer_plans_user ON public.newcomer_plans (user_id);
CREATE INDEX IF NOT EXISTS idx_newcomer_plans_household ON public.newcomer_plans (household_id);

CREATE TABLE IF NOT EXISTS public.newcomer_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  plan_id uuid NOT NULL REFERENCES public.newcomer_plans(id) ON DELETE CASCADE,
  step_key text NOT NULL CHECK (step_key ~ '^[a-z0-9-]{2,60}$'),
  -- Who is doing it: a person in the family (null = anyone).
  assignee uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  done_at timestamptz,
  done_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text CHECK (note IS NULL OR length(note) <= 280),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, step_key)
);
CREATE INDEX IF NOT EXISTS idx_newcomer_steps_plan ON public.newcomer_steps (plan_id);
CREATE INDEX IF NOT EXISTS idx_newcomer_steps_household ON public.newcomer_steps (household_id);

ALTER TABLE public.newcomer_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newcomer_steps ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  shared_check text := '(auth.uid() = user_id OR (household_id IS NOT NULL AND household_id = public.my_household_id()))';
  own_household text := '(household_id IS NULL OR household_id = public.my_household_id())';
BEGIN
  FOREACH t IN ARRAY ARRAY['newcomer_plans', 'newcomer_steps'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_set_household', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_household_id()', t || '_set_household', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_shared', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_shared', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_shared', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_shared', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING %s', t || '_select_shared', t, shared_check);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING %s WITH CHECK (%s AND %s)', t || '_update_shared', t, shared_check, shared_check, own_household);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING %s', t || '_delete_shared', t, shared_check);
  END LOOP;
  EXECUTE format('CREATE POLICY %I ON public.newcomer_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND %s)', 'newcomer_plans_insert_shared', own_household);
  -- A step row must belong to a plan the person can see.
  EXECUTE format($p$CREATE POLICY %I ON public.newcomer_steps FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND %s AND EXISTS (
      SELECT 1 FROM public.newcomer_plans p WHERE p.id = plan_id
        AND (p.user_id = auth.uid() OR (p.household_id IS NOT NULL AND p.household_id = public.my_household_id()))
    ))$p$, 'newcomer_steps_insert_shared', own_household);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newcomer_plans, public.newcomer_steps TO authenticated;

-- Joining a family shares the newcomer plan too.
CREATE OR REPLACE FUNCTION public.share_my_items(target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
  -- Only ever into the caller's own household (called after joining).
  IF target IS NULL OR target IS DISTINCT FROM public.my_household_id() THEN
    RAISE EXCEPTION 'Not a member of that household';
  END IF;
  FOREACH t IN ARRAY ARRAY['family_members', 'family_events', 'planner_tasks', 'meal_plans',
                           'pantry_items', 'grocery_lists', 'grocery_items',
                           'newcomer_plans', 'newcomer_steps'] LOOP
    EXECUTE format('UPDATE public.%I SET household_id = $1 WHERE user_id = $2', t) USING target, auth.uid();
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.share_my_items(uuid) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.share_my_items(uuid) FROM anon, authenticated;
  END IF;
END $$;
