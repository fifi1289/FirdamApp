-- Earn with Firdam, Phase 1: ambassadors with free-month rewards.
--
-- Every user gets an invite code (firdam.com/join/<code>). A new family that
-- signs up within REFERRAL_WINDOW_DAYS of clicking the link is attributed to
-- that ambassador, permanently (first ambassador wins). When the family has
-- verified its email, completed its family profile and been active on
-- AMBASSADOR_ACTIVE_DAYS different days within its first
-- AMBASSADOR_ACTIVE_WINDOW_DAYS, the ambassador banks one free month
-- (max FREE_MONTHS_MAX_BANKED, each expires after FREE_MONTH_EXPIRY_MONTHS).
--
-- Everything is behind EARN_AMBASSADORS_LIVE (off by default). There is no
-- scheduled job: referrals are evaluated whenever the ambassador opens the
-- dashboard or an admin opens the referrals list.

-- ---------------------------------------------------------------- config
CREATE TABLE IF NOT EXISTS public.earn_config (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);
ALTER TABLE public.earn_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "earn_config_read" ON public.earn_config;
CREATE POLICY "earn_config_read" ON public.earn_config FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.earn_config TO anon, authenticated;

INSERT INTO public.earn_config (key, value, description) VALUES
  ('EARN_AMBASSADORS_LIVE', 'false', 'Ambassadors (invite links, free months) are open to everyone'),
  ('EARN_CREATORS_LIVE', 'false', 'Creator centre and creator earnings (Phase 2)'),
  ('EARN_SALES_LIVE', 'false', 'Paid courses, live lessons and partner sales (Phase 2b)'),
  ('EARN_ADS_LIVE', 'false', 'Sponsored content (Phase 3). Update the privacy policy first.'),
  ('SALES_IN_APP_ENABLED', 'false', 'Show sales inside the mobile apps'),
  ('REFERRAL_WINDOW_DAYS', '30', 'A link click counts if it happened this many days before sign-up'),
  ('AMBASSADOR_ACTIVE_DAYS', '7', 'Different active days a referred family needs'),
  ('AMBASSADOR_ACTIVE_WINDOW_DAYS', '30', '...within this many days after sign-up'),
  ('FREE_MONTHS_MAX_BANKED', '12', 'Most free months an ambassador can hold at once'),
  ('FREE_MONTH_EXPIRY_MONTHS', '12', 'A banked free month expires after this many months'),
  ('AMBASSADOR_TERMS_VERSION', '"2026-11-04-draft"', 'Current Ambassador Terms version; changing it asks everyone to accept again'),
  ('PRICE_MONTHLY', '4.99', 'Firdam Family, CAD per month'),
  ('PRICE_YEARLY', '39.99', 'Firdam Family, CAD per year'),
  ('AMBASSADOR_RATE', '0.20', 'Share of net received paid to the ambassador (once the paid plan is live)'),
  ('AMBASSADOR_PAID_MONTHS', '12', 'First paid months of a family that earn the ambassador money'),
  ('CREATOR_SLICE', '0.20', 'Share of net received split among Earning Creators'),
  ('PAYOUT_THRESHOLD', '25.00', 'CAD available balance before a payout'),
  ('HOLD_DAYS', '30', 'Days after month end before earnings become available'),
  ('GATE_ACCOUNT_AGE_DAYS', '30', 'Earning Gate: account age'),
  ('GATE_APPROVED_ITEMS', '10', 'Earning Gate: approved content items'),
  ('GATE_FOLLOWERS', '100', 'Earning Gate: followers'),
  ('GATE_USES_90D', '300', 'Earning Gate: completed uses in the last 90 days'),
  ('GATE_FAMILIES_90D', '30', 'Earning Gate: different families in the last 90 days'),
  ('GATE_PAYING_USES_90D', '100', 'Earning Gate: completed uses by paying families'),
  ('FAMILY_MONTH_POINT_CAP', '300', 'Counted points per family per month, all creators'),
  ('CREATOR_FAMILY_MONTH_POINT_CAP', '60', 'Counted points one creator can get from one family per month'),
  ('VELOCITY_FLAG_EVENTS_PER_DAY', '100', 'Completed uses per family per day before it is flagged'),
  ('COURSE_COMMISSION', '0.15', 'Firdam commission on paid courses'),
  ('SERVICE_COMMISSION', '0.10', 'Firdam commission on live lessons and services'),
  ('PARTNER_COMMISSION', '0.10', 'Firdam commission on partner sales (new partners only, after the founding period)'),
  ('FOUNDING_FREE_UNTIL', '"2027-11-01"', 'Founding partners and creators pay 0% commission until this date'),
  ('AD_CPM', '10', 'CAD per 1,000 counted ad impressions'),
  ('AD_CREATOR_SHARE', '0.55', 'Creator share of ad money on her content')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.earn_cfg(p_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM public.earn_config WHERE key = p_key;
$$;

-- Founding partners keep 0% commission until they agree new terms in writing.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'partner_shops') THEN
    ALTER TABLE public.partner_shops ADD COLUMN IF NOT EXISTS commission_agreed boolean NOT NULL DEFAULT false;
    ALTER TABLE public.partner_shops ADD COLUMN IF NOT EXISTS founding_partner boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Accounts that never earn (test and staff accounts). Admins never earn either.
CREATE TABLE IF NOT EXISTS public.earn_excluded_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.earn_excluded_users ENABLE ROW LEVEL SECURITY;
INSERT INTO public.earn_excluded_users (user_id, reason)
  SELECT id, 'App Store review account' FROM auth.users WHERE lower(email) = 'review@firdam.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.earn_is_excluded(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.earn_excluded_users WHERE user_id = p_user)
      OR EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = p_user);
$$;

-- Plus-addressing and Gmail dots removed, so a.b+x@gmail.com = ab@gmail.com.
CREATE OR REPLACE FUNCTION public.earn_normalize_email(p_email text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_local text; v_domain text;
BEGIN
  IF p_email IS NULL OR position('@' in p_email) = 0 THEN RETURN lower(p_email); END IF;
  v_local := lower(split_part(p_email, '@', 1));
  v_domain := lower(split_part(p_email, '@', 2));
  v_local := split_part(v_local, '+', 1);
  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  END IF;
  RETURN v_local || '@' || v_domain;
END $$;

-- ---------------------------------------------------------------- tables
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE CHECK (code ~ '^[a-z2-9]{6,12}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referral_codes_own" ON public.referral_codes;
CREATE POLICY "referral_codes_own" ON public.referral_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id         bigserial PRIMARY KEY,
  code       text NOT NULL,
  visitor_id text,
  source     text NOT NULL DEFAULT 'web',
  clicked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_clicks_code_idx ON public.referral_clicks (code, clicked_at);
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  referred_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ambassador_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code             text NOT NULL,
  clicked_at       timestamptz NOT NULL,
  signed_up_at     timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'not_qualified')),
  flags            text[] NOT NULL DEFAULT '{}',
  review           text NOT NULL DEFAULT 'none' CHECK (review IN ('none', 'flagged', 'cleared', 'void')),
  active_days      int NOT NULL DEFAULT 0,
  qualified_at     timestamptz,
  evaluated_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_attributions_ambassador_idx ON public.referral_attributions (ambassador_id);
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

-- One row per user per day they opened Firdam (UTC date).
CREATE TABLE IF NOT EXISTS public.user_activity_days (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day     date NOT NULL,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.user_activity_days ENABLE ROW LEVEL SECURITY;

-- Free months: append-only apart from the status moving banked -> used / expired.
CREATE TABLE IF NOT EXISTS public.free_month_ledger (
  id               bigserial PRIMARY KEY,
  ambassador_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status           text NOT NULL CHECK (status IN ('banked', 'used', 'expired', 'over_cap')),
  earned_at        timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  used_at          timestamptz
);
CREATE INDEX IF NOT EXISTS free_month_ledger_ambassador_idx ON public.free_month_ledger (ambassador_id);
ALTER TABLE public.free_month_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "free_month_ledger_own" ON public.free_month_ledger;
CREATE POLICY "free_month_ledger_own" ON public.free_month_ledger FOR SELECT TO authenticated USING (auth.uid() = ambassador_id);

CREATE TABLE IF NOT EXISTS public.earn_terms_acceptances (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms       text NOT NULL CHECK (terms IN ('ambassador', 'creator', 'seller')),
  version     text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, terms, version)
);
ALTER TABLE public.earn_terms_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "earn_terms_own" ON public.earn_terms_acceptances;
CREATE POLICY "earn_terms_own" ON public.earn_terms_acceptances FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------- user RPCs
CREATE OR REPLACE FUNCTION public.earn_ambassadors_live()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT value = 'true'::jsonb FROM public.earn_config WHERE key = 'EARN_AMBASSADORS_LIVE'), false);
$$;

-- The caller's invite code, created on first use.
CREATE OR REPLACE FUNCTION public.my_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_alphabet text := 'abcdefghjkmnpqrstuvwxyz23456789';
  i int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501'; END IF;
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_code := '';
    FOR i IN 1..7 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (v_uid, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_uid;
      IF v_code IS NOT NULL THEN RETURN v_code; END IF;
    END;
  END LOOP;
END $$;

-- Logs a visit to /join/<code>. Returns true when the code is real and the
-- programme is open (the site then remembers the code until sign-up).
CREATE OR REPLACE FUNCTION public.log_referral_click(p_code text, p_visitor text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text := lower(trim(coalesce(p_code, '')));
BEGIN
  IF NOT public.earn_ambassadors_live() THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code) THEN RETURN false; END IF;
  IF p_visitor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.referral_clicks
    WHERE code = v_code AND visitor_id = left(p_visitor, 64) AND clicked_at > now() - interval '1 day'
  ) THEN
    INSERT INTO public.referral_clicks (code, visitor_id) VALUES (v_code, left(p_visitor, 64));
  END IF;
  RETURN true;
END $$;

-- Called right after sign-up with the remembered code (web) or the code typed
-- in the app. Returns ok | off | invalid | self | already | too_late | expired.
CREATE OR REPLACE FUNCTION public.claim_referral(p_code text, p_clicked_at timestamptz DEFAULT NULL, p_source text DEFAULT 'web')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := lower(trim(coalesce(p_code, '')));
  v_ambassador uuid;
  v_created timestamptz;
  v_email text;
  v_amb_email text;
  v_clicked timestamptz;
  v_window int := coalesce((public.earn_cfg('REFERRAL_WINDOW_DAYS'))::text::int, 30);
  v_flags text[] := '{}';
  v_review text := 'none';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501'; END IF;
  IF NOT public.earn_ambassadors_live() THEN RETURN 'off'; END IF;
  SELECT user_id INTO v_ambassador FROM public.referral_codes WHERE code = v_code;
  IF v_ambassador IS NULL THEN RETURN 'invalid'; END IF;
  IF v_ambassador = v_uid THEN RETURN 'self'; END IF;
  IF EXISTS (SELECT 1 FROM public.referral_attributions WHERE referred_user_id = v_uid) THEN RETURN 'already'; END IF;

  SELECT created_at, email INTO v_created, v_email FROM auth.users WHERE id = v_uid;
  -- Only brand-new accounts can be referred.
  IF v_created IS NULL OR v_created < now() - interval '3 days' THEN RETURN 'too_late'; END IF;

  v_clicked := least(coalesce(p_clicked_at, now()), now());
  IF v_clicked < v_created - make_interval(days => v_window) THEN RETURN 'expired'; END IF;
  IF p_source <> 'web' THEN
    INSERT INTO public.referral_clicks (code, source, clicked_at) VALUES (v_code, left(p_source, 20), v_clicked);
  END IF;

  SELECT email INTO v_amb_email FROM auth.users WHERE id = v_ambassador;
  IF public.earn_normalize_email(v_email) = public.earn_normalize_email(v_amb_email) THEN
    v_flags := array_append(v_flags, 'same_email');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.household_members a JOIN public.household_members b USING (household_id)
    WHERE a.user_id = v_ambassador AND b.user_id = v_uid
  ) THEN
    v_flags := array_append(v_flags, 'same_household');
  END IF;
  IF array_length(v_flags, 1) > 0 THEN v_review := 'flagged'; END IF;
  IF public.earn_is_excluded(v_ambassador) OR public.earn_is_excluded(v_uid) THEN
    v_flags := array_append(v_flags, 'excluded_account');
    v_review := 'void';
  END IF;

  INSERT INTO public.referral_attributions (referred_user_id, ambassador_id, code, clicked_at, signed_up_at, flags, review)
  VALUES (v_uid, v_ambassador, v_code, v_clicked, v_created, v_flags, v_review)
  ON CONFLICT (referred_user_id) DO NOTHING;
  RETURN 'ok';
END $$;

-- Records that the caller used Firdam today.
CREATE OR REPLACE FUNCTION public.touch_activity()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_activity_days (user_id, day) VALUES (auth.uid(), (now() AT TIME ZONE 'utc')::date)
  ON CONFLICT DO NOTHING;
END $$;

-- Banks the free month for a qualified, unflagged referral (once per family).
CREATE OR REPLACE FUNCTION public.earn_award_free_month(p_referred uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.referral_attributions;
  v_banked int;
  v_max int := coalesce((public.earn_cfg('FREE_MONTHS_MAX_BANKED'))::text::int, 12);
  v_expiry int := coalesce((public.earn_cfg('FREE_MONTH_EXPIRY_MONTHS'))::text::int, 12);
BEGIN
  SELECT * INTO a FROM public.referral_attributions WHERE referred_user_id = p_referred;
  IF NOT FOUND OR a.status <> 'qualified' OR a.review NOT IN ('none', 'cleared') THEN RETURN; END IF;
  IF public.earn_is_excluded(a.ambassador_id) OR public.earn_is_excluded(a.referred_user_id) THEN RETURN; END IF;
  SELECT count(*) INTO v_banked FROM public.free_month_ledger
    WHERE ambassador_id = a.ambassador_id AND status = 'banked' AND expires_at > now();
  INSERT INTO public.free_month_ledger (ambassador_id, referred_user_id, status, earned_at, expires_at)
  VALUES (a.ambassador_id, a.referred_user_id,
          CASE WHEN v_banked >= v_max THEN 'over_cap' ELSE 'banked' END,
          now(), now() + make_interval(months => v_expiry))
  ON CONFLICT (referred_user_id) DO NOTHING;
END $$;

-- Re-checks pending referrals (one ambassador, or everyone when null) and
-- expires old free months.
CREATE OR REPLACE FUNCTION public.earn_evaluate(p_ambassador uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a record;
  v_need int := coalesce((public.earn_cfg('AMBASSADOR_ACTIVE_DAYS'))::text::int, 7);
  v_window int := coalesce((public.earn_cfg('AMBASSADOR_ACTIVE_WINDOW_DAYS'))::text::int, 30);
  v_days int;
  v_verified boolean;
  v_profile boolean;
BEGIN
  UPDATE public.free_month_ledger SET status = 'expired'
    WHERE status = 'banked' AND expires_at <= now()
      AND (p_ambassador IS NULL OR ambassador_id = p_ambassador);

  FOR a IN
    SELECT * FROM public.referral_attributions
    WHERE status = 'pending' AND (p_ambassador IS NULL OR ambassador_id = p_ambassador)
  LOOP
    SELECT count(*) INTO v_days FROM public.user_activity_days
      WHERE user_id = a.referred_user_id
        AND day >= (a.signed_up_at AT TIME ZONE 'utc')::date
        AND day < (a.signed_up_at AT TIME ZONE 'utc')::date + v_window;
    EXECUTE 'SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = $1'
      INTO v_verified USING a.referred_user_id;
    SELECT coalesce(nullif(trim(p.first_name), ''), NULL) IS NOT NULL
           AND EXISTS (SELECT 1 FROM public.family_members f WHERE f.user_id = a.referred_user_id)
      INTO v_profile
      FROM public.profiles p WHERE p.id = a.referred_user_id;

    IF v_days >= v_need AND coalesce(v_verified, false) AND coalesce(v_profile, false) THEN
      UPDATE public.referral_attributions
        SET status = 'qualified', qualified_at = now(), active_days = v_days, evaluated_at = now()
        WHERE referred_user_id = a.referred_user_id;
      PERFORM public.earn_award_free_month(a.referred_user_id);
    ELSIF v_days < v_need AND now() >= a.signed_up_at + make_interval(days => v_window) THEN
      UPDATE public.referral_attributions
        SET status = 'not_qualified', active_days = v_days, evaluated_at = now()
        WHERE referred_user_id = a.referred_user_id;
    ELSE
      UPDATE public.referral_attributions
        SET active_days = v_days, evaluated_at = now()
        WHERE referred_user_id = a.referred_user_id;
    END IF;
  END LOOP;
END $$;

-- Everything the ambassador dashboard shows. Families are anonymised.
CREATE OR REPLACE FUNCTION public.my_ambassador_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_version text := (public.earn_cfg('AMBASSADOR_TERMS_VERSION')) #>> '{}';
  v_window int := coalesce((public.earn_cfg('AMBASSADOR_ACTIVE_WINDOW_DAYS'))::text::int, 30);
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501'; END IF;
  v_code := public.my_referral_code();
  PERFORM public.earn_evaluate(v_uid);

  SELECT jsonb_build_object(
    'live', public.earn_ambassadors_live(),
    'code', v_code,
    'excluded', public.earn_is_excluded(v_uid),
    'terms_version', v_version,
    'terms_accepted_at', (SELECT accepted_at FROM public.earn_terms_acceptances
                          WHERE user_id = v_uid AND terms = 'ambassador' AND version = v_version),
    'needed_days', coalesce((public.earn_cfg('AMBASSADOR_ACTIVE_DAYS'))::text::int, 7),
    'window_days', v_window,
    'max_banked', coalesce((public.earn_cfg('FREE_MONTHS_MAX_BANKED'))::text::int, 12),
    'clicks', (SELECT count(*) FROM public.referral_clicks WHERE code = v_code),
    'signups', (SELECT count(*) FROM public.referral_attributions WHERE ambassador_id = v_uid),
    'qualified', (SELECT count(*) FROM public.referral_attributions WHERE ambassador_id = v_uid AND status = 'qualified'),
    'paying', (SELECT count(*) FROM public.referral_attributions r JOIN public.subscriptions s ON s.user_id = r.referred_user_id
               WHERE r.ambassador_id = v_uid AND s.plan <> 'free' AND s.status = 'active'),
    'months_banked', (SELECT count(*) FROM public.free_month_ledger WHERE ambassador_id = v_uid AND status = 'banked'),
    'months_used', (SELECT count(*) FROM public.free_month_ledger WHERE ambassador_id = v_uid AND status = 'used'),
    'months_expiring', (SELECT count(*) FROM public.free_month_ledger WHERE ambassador_id = v_uid AND status = 'banked'
                        AND expires_at < now() + interval '30 days'),
    'next_expiry', (SELECT min(expires_at) FROM public.free_month_ledger WHERE ambassador_id = v_uid AND status = 'banked'),
    'families', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'joined', r.signed_up_at,
        'status', r.status,
        'on_hold', r.review IN ('flagged', 'void'),
        'active_days', r.active_days,
        'window_ends', r.signed_up_at + make_interval(days => v_window),
        'paying', EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = r.referred_user_id AND s.plan <> 'free' AND s.status = 'active'),
        'free_month', (SELECT status FROM public.free_month_ledger l WHERE l.referred_user_id = r.referred_user_id)
      ) ORDER BY r.signed_up_at DESC)
      FROM public.referral_attributions r WHERE r.ambassador_id = v_uid
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.accept_earn_terms(p_terms text, p_version text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current text := (public.earn_cfg(upper(p_terms) || '_TERMS_VERSION')) #>> '{}';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501'; END IF;
  IF v_current IS NULL OR p_version IS DISTINCT FROM v_current THEN
    RAISE EXCEPTION 'These terms have changed. Please reload the page.';
  END IF;
  INSERT INTO public.earn_terms_acceptances (user_id, terms, version) VALUES (auth.uid(), p_terms, p_version)
  ON CONFLICT DO NOTHING;
  RETURN (SELECT accepted_at FROM public.earn_terms_acceptances WHERE user_id = auth.uid() AND terms = p_terms AND version = p_version);
END $$;

-- ---------------------------------------------------------------- admin RPCs
CREATE OR REPLACE FUNCTION public.admin_earn_referrals()
RETURNS TABLE (
  referred_user_id uuid, referred_email text, ambassador_id uuid, ambassador_email text,
  clicked_at timestamptz, signed_up_at timestamptz, status text, flags text[], review text,
  active_days int, free_month text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admins only' USING ERRCODE = '42501'; END IF;
  PERFORM public.earn_evaluate(NULL);
  RETURN QUERY
    SELECT r.referred_user_id, ru.email::text, r.ambassador_id, au.email::text,
           r.clicked_at, r.signed_up_at, r.status, r.flags, r.review, r.active_days,
           (SELECT l.status FROM public.free_month_ledger l WHERE l.referred_user_id = r.referred_user_id)
    FROM public.referral_attributions r
    LEFT JOIN auth.users ru ON ru.id = r.referred_user_id
    LEFT JOIN auth.users au ON au.id = r.ambassador_id
    ORDER BY r.signed_up_at DESC;
END $$;

-- clear: a flagged referral is fine (the free month is banked if earned). void: never rewards.
CREATE OR REPLACE FUNCTION public.admin_review_referral(p_referred uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admins only' USING ERRCODE = '42501'; END IF;
  IF p_action NOT IN ('clear', 'void') THEN RAISE EXCEPTION 'unknown action'; END IF;
  UPDATE public.referral_attributions
    SET review = CASE p_action WHEN 'clear' THEN 'cleared' ELSE 'void' END
    WHERE referred_user_id = p_referred;
  IF p_action = 'clear' THEN PERFORM public.earn_award_free_month(p_referred); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_earn_config(p_key text, p_value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admins only' USING ERRCODE = '42501'; END IF;
  SELECT value INTO v_old FROM public.earn_config WHERE key = p_key;
  IF v_old IS NULL THEN RAISE EXCEPTION 'unknown setting %', p_key; END IF;
  IF jsonb_typeof(v_old) <> jsonb_typeof(p_value) THEN
    RAISE EXCEPTION 'setting % must be a %', p_key, jsonb_typeof(v_old);
  END IF;
  UPDATE public.earn_config SET value = p_value, updated_at = now(), updated_by = auth.uid() WHERE key = p_key;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_earn_excluded(p_user uuid, p_excluded boolean, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admins only' USING ERRCODE = '42501'; END IF;
  IF p_excluded THEN
    INSERT INTO public.earn_excluded_users (user_id, reason) VALUES (p_user, p_reason)
    ON CONFLICT (user_id) DO UPDATE SET reason = excluded.reason;
  ELSE
    DELETE FROM public.earn_excluded_users WHERE user_id = p_user;
  END IF;
END $$;

-- ---------------------------------------------------------------- grants
REVOKE ALL ON FUNCTION public.earn_cfg(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.earn_is_excluded(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.earn_award_free_month(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.earn_evaluate(uuid) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.earn_cfg(text) FROM authenticated, anon;
    REVOKE ALL ON FUNCTION public.earn_is_excluded(uuid) FROM authenticated, anon;
    REVOKE ALL ON FUNCTION public.earn_award_free_month(uuid) FROM authenticated, anon;
    REVOKE ALL ON FUNCTION public.earn_evaluate(uuid) FROM authenticated, anon;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.earn_ambassadors_live() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_referral_click(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral(text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_ambassador_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_earn_terms(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_earn_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_referral(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_earn_config(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_earn_excluded(uuid, boolean, text) TO authenticated;
