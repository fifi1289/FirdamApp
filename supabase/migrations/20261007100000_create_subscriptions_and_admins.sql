/*
# Subscriptions and admins

## subscriptions
One row per paying (or trialling) user, written only by the
`stripe-webhook` edge function with the service role. Users can read
their own row to unlock Premium / Family+ features. No row = Free plan.

## app_admins
Users who can review business listings, enquiries and reported
community events. Add yourself with:
  INSERT INTO public.app_admins (user_id) VALUES ('<your auth user id>');

`public.is_admin()` is used by RLS policies elsewhere.
*/

CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                    text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'family')),
  status                  text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  price_id                text,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role (webhook) writes.

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions (stripe_customer_id);

CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_admins_select_self" ON public.app_admins;
CREATE POLICY "app_admins_select_self" ON public.app_admins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
