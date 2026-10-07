/*
# Shared households (Family+)

Lets a family share one Firdam home: the family calendar, shopping lists,
household tasks, meal plans, pantry and family profiles become visible
and editable by every member of the household. Budgets, trackers and
personal settings stay private.

## Tables
- `households`          one per family, created by a Family+ subscriber
- `household_members`   who belongs (a user can be in one household)
- `household_invites`   invite links (token) sent to an email address

## How sharing works
- Shared tables get a nullable `household_id`. A BEFORE INSERT trigger
  fills it with the creator's household, so every app screen shares new
  items automatically.
- RLS on shared tables: you can see/edit a row if you own it OR it belongs
  to your household.
- Joining a household moves your existing shared items into it; leaving
  takes your own items back.

## RPCs (SECURITY DEFINER, validated inside)
- create_household(name)        Family+ (or admin) only
- accept_household_invite(token)
- leave_household()
- remove_household_member(member)
*/

CREATE TABLE IF NOT EXISTS public.households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.household_members (
  household_id  uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  display_name  text,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.household_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email         text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 200),
  token         uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '14 days'
);

CREATE OR REPLACE FUNCTION public.my_household_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT household_id FROM public.household_members WHERE user_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.my_household_id() TO authenticated;

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "households_select_member" ON public.households;
CREATE POLICY "households_select_member" ON public.households
  FOR SELECT TO authenticated USING (id = public.my_household_id());
DROP POLICY IF EXISTS "households_update_owner" ON public.households;
CREATE POLICY "households_update_owner" ON public.households
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "household_members_select" ON public.household_members;
CREATE POLICY "household_members_select" ON public.household_members
  FOR SELECT TO authenticated USING (household_id = public.my_household_id());

DROP POLICY IF EXISTS "household_invites_select" ON public.household_invites;
CREATE POLICY "household_invites_select" ON public.household_invites
  FOR SELECT TO authenticated USING (household_id = public.my_household_id());
DROP POLICY IF EXISTS "household_invites_insert" ON public.household_invites;
CREATE POLICY "household_invites_insert" ON public.household_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "household_invites_update" ON public.household_invites;
CREATE POLICY "household_invites_update" ON public.household_invites
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid()));

-- ── Shared tables ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_household_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.household_id IS NULL THEN
      NEW.household_id := public.my_household_id();
    END IF;
  ELSE
    -- Family members can edit shared items, but never take them over.
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Name shown in the members list.
CREATE OR REPLACE FUNCTION public.my_display_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    split_part(u.email, '@', 1)
  )
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.my_display_name() FROM PUBLIC;

DO $$
DECLARE
  t text;
  pol record;
  shared_check text := '(auth.uid() = user_id OR (household_id IS NOT NULL AND household_id = public.my_household_id()))';
  -- Rows can only ever be placed in your own household.
  own_household text := '(household_id IS NULL OR household_id = public.my_household_id())';
BEGIN
  FOREACH t IN ARRAY ARRAY['family_members', 'family_events', 'planner_tasks', 'meal_plans',
                           'pantry_items', 'grocery_lists', 'grocery_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE SET NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (household_id)', 'idx_' || t || '_household', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_set_household', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_household_id()', t || '_set_household', t);

    -- Replace the owner-only policies with household-aware ones.
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING %s', t || '_select_shared', t, shared_check);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING %s WITH CHECK (%s AND %s)', t || '_update_shared', t, shared_check, shared_check, own_household);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING %s', t || '_delete_shared', t, shared_check);
    IF t = 'grocery_items' THEN
      EXECUTE format($p$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id AND %s AND EXISTS (
          SELECT 1 FROM public.grocery_lists l WHERE l.id = list_id
            AND (l.user_id = auth.uid() OR (l.household_id IS NOT NULL AND l.household_id = public.my_household_id()))
        ))$p$, t || '_insert_shared', t, own_household);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND %s)', t || '_insert_shared', t, own_household);
    END IF;
  END LOOP;
END $$;

-- ── RPCs ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.share_my_items(target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
  -- Only ever into the caller's own household (called after joining).
  IF target IS NULL OR target IS DISTINCT FROM public.my_household_id() THEN
    RAISE EXCEPTION 'Not a member of that household';
  END IF;
  FOREACH t IN ARRAY ARRAY['family_members', 'family_events', 'planner_tasks', 'meal_plans',
                           'pantry_items', 'grocery_lists', 'grocery_items'] LOOP
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

CREATE OR REPLACE FUNCTION public.create_household(household_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hid uuid;
  allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF public.my_household_id() IS NOT NULL THEN RAISE EXCEPTION 'You are already in a household'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid() AND s.plan = 'family'
      AND s.status IN ('active', 'trialing', 'past_due')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ) OR public.is_admin() INTO allowed;
  IF NOT allowed THEN RAISE EXCEPTION 'A Family+ plan is needed to create a shared household'; END IF;

  INSERT INTO public.households (name, owner_id) VALUES (coalesce(nullif(trim(household_name), ''), 'Our family'), auth.uid())
    RETURNING id INTO hid;
  INSERT INTO public.household_members (household_id, user_id, role, display_name)
    VALUES (hid, auth.uid(), 'owner', public.my_display_name());
  PERFORM public.share_my_items(hid);
  RETURN hid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_household_invite(invite_token uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.household_invites%ROWTYPE;
  my_email text := lower(coalesce(auth.jwt() ->> 'email', (SELECT email FROM auth.users WHERE id = auth.uid())));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO inv FROM public.household_invites WHERE token = invite_token;
  IF NOT FOUND OR inv.status <> 'pending' OR inv.expires_at < now() THEN
    RAISE EXCEPTION 'This invite is no longer valid';
  END IF;
  IF lower(inv.email) <> my_email THEN
    RAISE EXCEPTION 'This invite was sent to a different email address';
  END IF;
  IF public.my_household_id() IS NOT NULL THEN RAISE EXCEPTION 'Leave your current household first'; END IF;
  IF (SELECT count(*) FROM public.household_members WHERE household_id = inv.household_id) >= 8 THEN
    RAISE EXCEPTION 'This household is full';
  END IF;

  INSERT INTO public.household_members (household_id, user_id, role, display_name)
    VALUES (inv.household_id, auth.uid(), 'member', public.my_display_name());
  UPDATE public.household_invites SET status = 'accepted' WHERE id = inv.id;
  PERFORM public.share_my_items(inv.household_id);
  RETURN inv.household_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_household_invite(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_household()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hid uuid := public.my_household_id();
  t text;
BEGIN
  IF hid IS NULL THEN RETURN; END IF;
  FOREACH t IN ARRAY ARRAY['family_members', 'family_events', 'planner_tasks', 'meal_plans',
                           'pantry_items', 'grocery_lists'] LOOP
    EXECUTE format('UPDATE public.%I SET household_id = NULL WHERE user_id = $1 AND household_id = $2', t) USING auth.uid(), hid;
  END LOOP;
  -- Items follow their list: ones added to the family's lists stay with the family.
  UPDATE public.grocery_items i SET household_id = NULL
    WHERE i.household_id = hid
      AND EXISTS (SELECT 1 FROM public.grocery_lists l WHERE l.id = i.list_id AND l.user_id = auth.uid());
  DELETE FROM public.household_members WHERE household_id = hid AND user_id = auth.uid();
  -- The last person out closes the household; otherwise pass ownership on.
  IF NOT EXISTS (SELECT 1 FROM public.household_members WHERE household_id = hid) THEN
    DELETE FROM public.households WHERE id = hid;
  ELSIF (SELECT owner_id FROM public.households WHERE id = hid) = auth.uid() THEN
    UPDATE public.households SET owner_id = (
      SELECT user_id FROM public.household_members WHERE household_id = hid ORDER BY joined_at LIMIT 1
    ) WHERE id = hid;
    UPDATE public.household_members SET role = 'owner'
      WHERE household_id = hid AND user_id = (SELECT owner_id FROM public.households WHERE id = hid);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.leave_household() TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_household_member(member uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hid uuid := public.my_household_id();
  t text;
BEGIN
  IF hid IS NULL OR (SELECT owner_id FROM public.households WHERE id = hid) <> auth.uid() THEN
    RAISE EXCEPTION 'Only the household owner can remove members';
  END IF;
  IF member = auth.uid() THEN RAISE EXCEPTION 'Use leave instead'; END IF;
  FOREACH t IN ARRAY ARRAY['family_members', 'family_events', 'planner_tasks', 'meal_plans',
                           'pantry_items', 'grocery_lists'] LOOP
    EXECUTE format('UPDATE public.%I SET household_id = NULL WHERE user_id = $1 AND household_id = $2', t) USING member, hid;
  END LOOP;
  -- Items follow their list: ones added to the family's lists stay with the family.
  UPDATE public.grocery_items i SET household_id = NULL
    WHERE i.household_id = hid
      AND EXISTS (SELECT 1 FROM public.grocery_lists l WHERE l.id = i.list_id AND l.user_id = member);
  DELETE FROM public.household_members WHERE household_id = hid AND user_id = member;
END;
$$;
GRANT EXECUTE ON FUNCTION public.remove_household_member(uuid) TO authenticated;

-- What the invite page shows before someone accepts.
CREATE OR REPLACE FUNCTION public.household_invite_preview(invite_token uuid)
RETURNS TABLE (household_name text, invited_by_name text, email text, valid boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.name,
         (SELECT m.display_name FROM public.household_members m WHERE m.user_id = i.invited_by),
         i.email,
         (i.status = 'pending' AND i.expires_at > now())
  FROM public.household_invites i JOIN public.households h ON h.id = i.household_id
  WHERE i.token = invite_token;
$$;
GRANT EXECUTE ON FUNCTION public.household_invite_preview(uuid) TO authenticated;
