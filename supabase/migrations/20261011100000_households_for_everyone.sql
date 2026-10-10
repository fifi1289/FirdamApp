-- Shared households for everyone: anyone can start a household; it holds 2 people
-- (for example a couple) on the Free plan, and up to 8 once anyone in it has a
-- paid plan (Firdam Family). Re-runnable.

-- True when someone in the household has an active paid plan.
CREATE OR REPLACE FUNCTION public.household_is_paid(hid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members m
    JOIN public.subscriptions s ON s.user_id = m.user_id
    WHERE m.household_id = hid
      AND s.plan IN ('premium', 'family')
      AND s.status IN ('active', 'trialing', 'past_due')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.household_is_paid(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.household_is_paid(uuid) TO authenticated;

-- How many people the household may hold right now.
CREATE OR REPLACE FUNCTION public.household_capacity(hid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.household_is_paid(hid) OR public.is_admin() THEN 8 ELSE 2 END;
$$;
REVOKE EXECUTE ON FUNCTION public.household_capacity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.household_capacity(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_household(household_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF public.my_household_id() IS NOT NULL THEN RAISE EXCEPTION 'You are already in a household'; END IF;

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
  -- Someone joining with their own paid plan also lifts the limit.
  IF (SELECT count(*) FROM public.household_members WHERE household_id = inv.household_id)
       >= public.household_capacity(inv.household_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.subscriptions s
       WHERE s.user_id = auth.uid() AND s.plan IN ('premium', 'family')
         AND s.status IN ('active', 'trialing', 'past_due')
         AND (s.current_period_end IS NULL OR s.current_period_end > now())
     )
     OR (SELECT count(*) FROM public.household_members WHERE household_id = inv.household_id) >= 8 THEN
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
