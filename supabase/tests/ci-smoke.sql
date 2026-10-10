-- Smoke test: as a signed-in user, write to the new tables and check RLS.
\set ON_ERROR_STOP on
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'a@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'b@example.com');
GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated;

SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

INSERT INTO public.halal_places (name, category, latitude, longitude) VALUES ('Test Butcher', 'butcher', 45.4, -75.7);
INSERT INTO public.halal_place_reviews (place_key, rating, halal_confirmed) VALUES ('osm:node/1', 5, true);
INSERT INTO public.saved_halal_places (place_key) VALUES ('osm:node/1');
INSERT INTO public.grocery_lists (name) VALUES ('Weekly');
INSERT INTO public.grocery_items (list_id, name) SELECT id, 'Dates' FROM public.grocery_lists LIMIT 1;
INSERT INTO public.budget_categories (name) VALUES ('Groceries');
INSERT INTO public.budget_transactions (type, amount) VALUES ('sadaqah', 20);
INSERT INTO public.savings_goals (name, kind, target) VALUES ('Hajj', 'hajj', 15000);
INSERT INTO public.ramadan_days (hijri_year, day, fast_status) VALUES (1448, 1, 'fasted')
  ON CONFLICT (user_id, hijri_year, day) DO UPDATE SET fast_status = EXCLUDED.fast_status;
INSERT INTO public.quran_reading_sessions (pages) VALUES (4);
INSERT INTO public.family_events (title, kind, starts_on) VALUES ('Eid lunch', 'eid', '2027-03-10');

DO $$ BEGIN
  IF (SELECT avg_rating FROM public.halal_place_ratings(ARRAY['osm:node/1'])) <> 5 THEN
    RAISE EXCEPTION 'ratings RPC returned the wrong value';
  END IF;
END $$;

-- Second user: sees shared places/reviews, but none of user 1's private data.
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.halal_places) <> 1 THEN RAISE EXCEPTION 'community places should be shared'; END IF;
  IF (SELECT count(*) FROM public.halal_place_reviews) <> 1 THEN RAISE EXCEPTION 'reviews should be shared'; END IF;
  IF (SELECT count(*) FROM public.grocery_lists) <> 0 THEN RAISE EXCEPTION 'grocery lists leaked'; END IF;
  IF (SELECT count(*) FROM public.budget_transactions) <> 0 THEN RAISE EXCEPTION 'transactions leaked'; END IF;
  IF (SELECT count(*) FROM public.saved_halal_places) <> 0 THEN RAISE EXCEPTION 'saved places leaked'; END IF;
  IF (SELECT count(*) FROM public.family_events) <> 0 THEN RAISE EXCEPTION 'events leaked'; END IF;
  IF (SELECT count(*) FROM public.ramadan_days) <> 0 THEN RAISE EXCEPTION 'ramadan days leaked'; END IF;
END $$;

-- User 2 cannot add items to user 1's list.
DO $$ BEGIN
  BEGIN
    INSERT INTO public.grocery_items (list_id, name)
      SELECT id, 'Sneaky' FROM public.grocery_lists LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- User 2 cannot delete user 1's community place.
DELETE FROM public.halal_places;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.halal_places) <> 1 THEN RAISE EXCEPTION 'another user deleted a community place'; END IF;
  IF (SELECT count(*) FROM public.grocery_items) <> 1 THEN RAISE EXCEPTION 'cross-user grocery insert succeeded'; END IF;
END $$;

-- Recipe seed and user recipes
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.recipes) < 27 THEN RAISE EXCEPTION 'recipe seed missing'; END IF;
  IF (SELECT count(*) FROM public.recipe_steps) < 100 THEN RAISE EXCEPTION 'recipe steps missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.recipes r WHERE r.cuisine_id IS NULL OR r.meal_type_id IS NULL) THEN
    RAISE EXCEPTION 'recipe lookups not linked';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.recipes r
    JOIN public.recipe_allergens ra ON ra.recipe_id = r.id
    JOIN public.allergens a ON a.id = ra.allergen_id
    WHERE r.name = 'Classic Hummus' AND a.name = 'Sesame'
  ) THEN RAISE EXCEPTION 'recipe allergens not linked'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.recipes r
    JOIN public.recipe_tags rt ON rt.recipe_id = r.id JOIN public.tags t ON t.id = rt.tag_id
    WHERE r.name = 'Classic Hummus' AND t.name = 'Vegan'
  ) THEN RAISE EXCEPTION 'recipe diet tags not linked'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.recipes r
    JOIN public.recipe_tags rt ON rt.recipe_id = r.id JOIN public.tags t ON t.id = rt.tag_id
    WHERE r.name = 'Chicken Biryani' AND t.name IN ('Vegetarian', 'Vegan')
  ) THEN RAISE EXCEPTION 'meat recipe tagged vegetarian'; END IF;
  IF (SELECT count(*) FROM public.recipes WHERE image_prompt IS NULL) > 0 THEN RAISE EXCEPTION 'image prompts missing'; END IF;
END $$;
INSERT INTO public.user_recipes (name, is_public) VALUES ('My private stew', false), ('Shared cake', true);
INSERT INTO public.recipe_favorites (recipe_key) VALUES ('catalog:x');
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.user_recipes) <> 1 THEN RAISE EXCEPTION 'private user recipe leaked or public one hidden'; END IF;
  IF (SELECT count(*) FROM public.recipe_favorites) <> 0 THEN RAISE EXCEPTION 'favourites leaked'; END IF;
  IF (SELECT count(*) FROM public.subscriptions) <> 0 THEN RAISE EXCEPTION 'subscriptions leaked'; END IF;
  IF public.is_admin() THEN RAISE EXCEPTION 'non-admin reported as admin'; END IF;
END $$;
-- Users cannot grant themselves a paid plan.
DO $$ BEGIN
  BEGIN
    INSERT INTO public.subscriptions (user_id, plan, status) VALUES ('00000000-0000-0000-0000-000000000002', 'premium', 'active');
    RAISE EXCEPTION 'user could insert a subscription';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- Business directory: listings start pending, owners can't self-approve.
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000003', 'admin@example.com');
INSERT INTO public.app_admins (user_id) VALUES ('00000000-0000-0000-0000-000000000003');
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.businesses (name, category, email) VALUES ('Barakah Umrah Tours', 'hajj_umrah', 'hi@example.com');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.businesses (name, category, status, is_partner) VALUES ('Sneaky', 'other', 'approved', true);
    RAISE EXCEPTION 'owner inserted an approved partner listing';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
UPDATE public.businesses SET status = 'approved', featured = true;
DO $$ BEGIN
  IF (SELECT status FROM public.businesses LIMIT 1) <> 'pending' THEN RAISE EXCEPTION 'owner self-approved'; END IF;
  IF (SELECT featured FROM public.businesses LIMIT 1) THEN RAISE EXCEPTION 'owner self-featured'; END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.businesses) <> 0 THEN RAISE EXCEPTION 'pending listing visible to others'; END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
UPDATE public.businesses SET status = 'approved', is_partner = true;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
INSERT INTO public.business_enquiries (business_id, name, email, message)
  SELECT id, 'Amina', 'amina@example.com', 'Umrah in March for 4' FROM public.businesses LIMIT 1;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.businesses WHERE is_partner) <> 1 THEN RAISE EXCEPTION 'approved partner not visible'; END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.business_enquiries) <> 1 THEN RAISE EXCEPTION 'owner cannot see enquiry'; END IF;
  IF (SELECT count(*) FROM public.trips) <> 0 THEN RAISE EXCEPTION 'unexpected trips'; END IF;
END $$;
INSERT INTO public.trips (name, destination_label, latitude, longitude) VALUES ('Umrah', 'Makkah', 21.42, 39.83);

-- Community events: visible to all, RSVP counts, reports hidden from others.
INSERT INTO public.community_events (title, kind, starts_at) VALUES ('Community iftar', 'iftar', now() + interval '2 days');
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
INSERT INTO public.event_rsvps (event_id, status) SELECT id, 'going' FROM public.community_events LIMIT 1;
INSERT INTO public.event_reports (event_id, reason) SELECT id, 'test' FROM public.community_events LIMIT 1;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.trips) <> 0 THEN RAISE EXCEPTION 'trips leaked'; END IF;
  IF (SELECT going FROM public.event_rsvp_counts(ARRAY(SELECT id FROM public.community_events))) <> 1 THEN
    RAISE EXCEPTION 'rsvp count wrong';
  END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.event_rsvps) <> 0 THEN RAISE EXCEPTION 'other users rsvps visible'; END IF;
  IF (SELECT count(*) FROM public.event_reports) <> 0 THEN RAISE EXCEPTION 'reports visible to author'; END IF;
END $$;
RESET ROLE;

-- Shared households (Family+)
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000004', 'c@example.com');
INSERT INTO public.subscriptions (user_id, plan, status) VALUES ('00000000-0000-0000-0000-000000000001', 'family', 'active');
SET ROLE authenticated;
-- Free users cannot create a household.
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  BEGIN
    PERFORM public.create_household('Sneaky');
    RAISE EXCEPTION 'free user created a household';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'free user created a household' THEN RAISE; END IF;
  END;
END $$;
-- Nor share their items into someone else's household directly.
DO $$ BEGIN
  BEGIN
    PERFORM public.share_my_items(gen_random_uuid());
    RAISE EXCEPTION 'share_my_items callable by users';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    IF SQLERRM = 'share_my_items callable by users' THEN RAISE; END IF;
  END;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT public.create_household('The Test family');
INSERT INTO public.household_invites (household_id, email)
  SELECT id, 'b@example.com' FROM public.households;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.household_members) <> 1 THEN RAISE EXCEPTION 'owner not a member'; END IF;
  IF (SELECT count(*) FROM public.grocery_lists WHERE household_id IS NOT NULL) <> 1 THEN RAISE EXCEPTION 'items not shared on create'; END IF;
END $$;
-- New items are shared automatically.
INSERT INTO public.planner_tasks (title, scheduled_date) VALUES ('Collect Eid gifts', '2027-03-09');
RESET ROLE;
CREATE TEMP TABLE invite_token AS SELECT token FROM public.household_invites LIMIT 1;
GRANT SELECT ON invite_token TO authenticated;
SET ROLE authenticated;
-- Wrong account cannot use the invite.
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.households) <> 0 THEN RAISE EXCEPTION 'household visible to outsider'; END IF;
  IF (SELECT count(*) FROM public.household_invites) <> 0 THEN RAISE EXCEPTION 'invites visible to outsider'; END IF;
  BEGIN
    PERFORM public.accept_household_invite((SELECT token FROM invite_token));
    RAISE EXCEPTION 'invite accepted by wrong email';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'invite accepted by wrong email' THEN RAISE; END IF;
  END;
END $$;
-- Invited user joins and sees the family's shared items, not private ones.
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  IF NOT (SELECT valid FROM public.household_invite_preview((SELECT token FROM invite_token))) THEN
    RAISE EXCEPTION 'invite preview invalid';
  END IF;
END $$;
SELECT public.accept_household_invite((SELECT token FROM invite_token));
INSERT INTO public.grocery_items (list_id, name) SELECT id, 'Milk' FROM public.grocery_lists LIMIT 1;
UPDATE public.family_events SET user_id = '00000000-0000-0000-0000-000000000002', title = 'Eid lunch at home';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.household_members) <> 2 THEN RAISE EXCEPTION 'join failed'; END IF;
  IF (SELECT count(*) FROM public.grocery_lists) <> 1 THEN RAISE EXCEPTION 'shared list not visible'; END IF;
  IF (SELECT count(*) FROM public.grocery_items) <> 2 THEN RAISE EXCEPTION 'shared items not visible'; END IF;
  IF (SELECT count(*) FROM public.planner_tasks) <> 1 THEN RAISE EXCEPTION 'shared task not visible'; END IF;
  IF (SELECT count(*) FROM public.budget_transactions) <> 0 THEN RAISE EXCEPTION 'budget leaked to household'; END IF;
  IF (SELECT count(*) FROM public.savings_goals) <> 0 THEN RAISE EXCEPTION 'savings leaked to household'; END IF;
  IF (SELECT user_id FROM public.family_events LIMIT 1) <> '00000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'member took over a shared item';
  END IF;
  IF (SELECT title FROM public.family_events LIMIT 1) <> 'Eid lunch at home' THEN RAISE EXCEPTION 'member could not edit shared event'; END IF;
END $$;
-- Rows cannot be pushed into a household you are not in.
DO $$ BEGIN
  BEGIN
    INSERT INTO public.planner_tasks (title, scheduled_date, household_id) VALUES ('Spam', '2027-01-01', gen_random_uuid());
    RAISE EXCEPTION 'row inserted into a foreign household';
  EXCEPTION WHEN insufficient_privilege OR foreign_key_violation THEN NULL;
  END;
END $$;
-- Leaving: private again, but items on the family list stay with the family.
SELECT public.leave_household();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.grocery_lists) <> 0 THEN RAISE EXCEPTION 'still sees family list after leaving'; END IF;
  IF (SELECT count(*) FROM public.planner_tasks) <> 0 THEN RAISE EXCEPTION 'still sees family tasks after leaving'; END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.household_members) <> 1 THEN RAISE EXCEPTION 'member not removed on leave'; END IF;
  IF (SELECT count(*) FROM public.grocery_items) <> 2 THEN RAISE EXCEPTION 'family list lost items on leave'; END IF;
END $$;
RESET ROLE;

-- Pantry tracking: cooking log and pantry history are private to the household.
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.pantry_items (name, category, quantity, unit, tracking, level) VALUES ('Rice', 'Pasta & Rice', 1, 'Pack', 'level', 'full');
INSERT INTO public.cooking_log (recipe_name, status) VALUES ('Chicken Karahi', 'cooked');
INSERT INTO public.pantry_events (batch_id, source, label, item_name, before) VALUES (gen_random_uuid(), 'cooked', 'Cooked Chicken Karahi', 'Chicken', '{"quantity": 1}');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.pantry_items (name, category, quantity, unit, tracking) VALUES ('Bad', 'Other', 1, 'Pieces', 'weird');
    RAISE EXCEPTION 'invalid tracking accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.cooking_log) <> 0 THEN RAISE EXCEPTION 'cooking log leaked'; END IF;
  IF (SELECT count(*) FROM public.pantry_events) <> 0 THEN RAISE EXCEPTION 'pantry history leaked'; END IF;
END $$;
RESET ROLE;

-- Two-step verification: users without it are unaffected; with a verified
-- factor, an aal1 session sees nothing until the code is verified.
DO $$ BEGIN
  IF to_regclass('auth.mfa_factors') IS NULL THEN
    CREATE TABLE auth.mfa_factors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status text);
  END IF;
END $$;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticated;
INSERT INTO auth.mfa_factors (user_id, status) VALUES ('00000000-0000-0000-0000-000000000001', 'verified');
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET request.jwt.claims = '{"aal": "aal1"}';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.pantry_items) <> 0 THEN RAISE EXCEPTION 'aal1 session could read data with 2FA on'; END IF;
  IF (SELECT count(*) FROM public.budget_transactions) <> 0 THEN RAISE EXCEPTION 'aal1 session could read budget with 2FA on'; END IF;
END $$;
SET request.jwt.claims = '{"aal": "aal2"}';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.pantry_items) = 0 THEN RAISE EXCEPTION 'aal2 session lost access'; END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
SET request.jwt.claims = '{"aal": "aal1"}';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.recipes) = 0 THEN RAISE EXCEPTION 'users without 2FA were affected'; END IF;
END $$;
RESET request.jwt.claims;
RESET ROLE;

SELECT 'RLS smoke test passed' AS result;
