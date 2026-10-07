/*
# Pantry that keeps itself up to date

- `pantry_items.tracking`: 'count' (real amounts, taken off when cooking) or
  'level' (staples like rice and flour, tracked as full/half/low/out).
- `cooking_log`: what the family cooked (or skipped) each day, so the app
  doesn't ask twice and can learn habits later.
- `pantry_events`: every pantry change with the row as it was before, grouped
  in batches, so any change (e.g. "I cooked this") can be undone.

Both new tables are shared with the household like the pantry itself.
*/

ALTER TABLE public.pantry_items ADD COLUMN IF NOT EXISTS tracking text NOT NULL DEFAULT 'count';
ALTER TABLE public.pantry_items ADD COLUMN IF NOT EXISTS level text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pantry_items_tracking_check') THEN
    ALTER TABLE public.pantry_items ADD CONSTRAINT pantry_items_tracking_check CHECK (tracking IN ('count', 'level'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pantry_items_level_check') THEN
    ALTER TABLE public.pantry_items ADD CONSTRAINT pantry_items_level_check CHECK (level IS NULL OR level IN ('full', 'half', 'low', 'out'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cooking_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  cooked_on    date NOT NULL DEFAULT CURRENT_DATE,
  meal_type    text,
  status       text NOT NULL DEFAULT 'cooked' CHECK (status IN ('cooked', 'other', 'skipped')),
  recipe_key   text,
  recipe_name  text,
  servings     numeric,
  -- "<meal plan id>:<day index>:<meal index>" when it came from the plan.
  plan_ref     text,
  batch_id     uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cooking_log_day ON public.cooking_log (cooked_on);
CREATE INDEX IF NOT EXISTS idx_cooking_log_plan_ref ON public.cooking_log (plan_ref);

CREATE TABLE IF NOT EXISTS public.pantry_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id   uuid REFERENCES public.households(id) ON DELETE SET NULL,
  batch_id       uuid NOT NULL,
  source         text NOT NULL CHECK (source IN ('cooked', 'shopping', 'quick_add', 'setup', 'manual', 'check', 'receipt', 'companion', 'undo')),
  label          text,
  pantry_item_id uuid,
  item_name      text NOT NULL,
  -- Row as it was before the change (NULL when the change created the item).
  before         jsonb,
  -- Row after the change (NULL when the change deleted it).
  after          jsonb,
  undone         boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pantry_events_batch ON public.pantry_events (batch_id);
CREATE INDEX IF NOT EXISTS idx_pantry_events_created ON public.pantry_events (created_at DESC);

ALTER TABLE public.cooking_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_events ENABLE ROW LEVEL SECURITY;

-- Same household sharing as the pantry.
DO $$
DECLARE
  t text;
  pol record;
  shared_check text := '(auth.uid() = user_id OR (household_id IS NOT NULL AND household_id = public.my_household_id()))';
  own_household text := '(household_id IS NULL OR household_id = public.my_household_id())';
BEGIN
  FOREACH t IN ARRAY ARRAY['cooking_log', 'pantry_events'] LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (household_id)', 'idx_' || t || '_household', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_set_household', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_household_id()', t || '_set_household', t);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING %s', t || '_select_shared', t, shared_check);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND %s)', t || '_insert_shared', t, own_household);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING %s WITH CHECK (%s AND %s)', t || '_update_shared', t, shared_check, shared_check, own_household);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING %s', t || '_delete_shared', t, shared_check);
  END LOOP;
END $$;
