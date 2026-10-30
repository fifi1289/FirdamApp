-- Admin: everyone who has a Firdam account, with what the admin needs to know
-- (name, email, when they joined and last signed in, how they sign in, plan,
-- family). Emails and sign-in times live in auth.users, which the app can't
-- read directly, so this runs as the owner and only answers the admin.
CREATE OR REPLACE FUNCTION public.admin_profiles()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  provider text,
  plan text,
  plan_status text,
  household text,
  household_role text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the Firdam admin can see profiles.';
  END IF;
  RETURN QUERY
  SELECT
    u.id,
    p.first_name,
    p.last_name,
    coalesce(p.email, u.email)::text,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at IS NOT NULL,
    coalesce(u.raw_app_meta_data->>'provider', 'email'),
    coalesce(s.plan, 'free'),
    s.status,
    h.name,
    hm.role
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT m.household_id, m.role FROM public.household_members m WHERE m.user_id = u.id ORDER BY m.joined_at LIMIT 1
  ) hm ON true
  LEFT JOIN public.households h ON h.id = hm.household_id
  ORDER BY u.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_profiles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_profiles() TO authenticated;
