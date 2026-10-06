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

SELECT 'RLS smoke test passed' AS result;
