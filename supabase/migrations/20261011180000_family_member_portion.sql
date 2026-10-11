-- How much each family member eats, when the family wants to set it themselves
-- (otherwise worked out from age). 1 = an adult portion. Re-runnable.
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS portion numeric;
ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_portion_range;
ALTER TABLE public.family_members ADD CONSTRAINT family_members_portion_range CHECK (portion IS NULL OR (portion >= 0.25 AND portion <= 3));
