/*
# Ramadan and Quran trackers

## Purpose
- `ramadan_days`            one row per user per Ramadan day: fast status,
                            taraweeh, Quran pages read, charity, notes
- `quran_reading_sessions`  Quran reading log used for streaks and khatm
                            progress throughout the year

## Security
RLS on both tables; every policy is owner-scoped (auth.uid() = user_id).
*/

CREATE TABLE IF NOT EXISTS public.ramadan_days (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hijri_year    integer NOT NULL CHECK (hijri_year BETWEEN 1400 AND 1600),
  day           integer NOT NULL CHECK (day BETWEEN 1 AND 30),
  fast_status   text CHECK (fast_status IS NULL OR fast_status IN ('fasted', 'missed', 'excused')),
  taraweeh      boolean NOT NULL DEFAULT false,
  quran_pages   integer NOT NULL DEFAULT 0 CHECK (quran_pages BETWEEN 0 AND 604),
  charity       boolean NOT NULL DEFAULT false,
  note          text CHECK (note IS NULL OR char_length(note) <= 500),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hijri_year, day)
);

CREATE TABLE IF NOT EXISTS public.quran_reading_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  read_on     date NOT NULL DEFAULT current_date,
  pages       integer NOT NULL CHECK (pages BETWEEN 1 AND 604),
  note        text CHECK (note IS NULL OR char_length(note) <= 200),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ramadan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_reading_sessions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ramadan_days', 'quran_reading_sessions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t || '_select_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t || '_insert_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t || '_update_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t || '_delete_own', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_quran_sessions_user_date ON public.quran_reading_sessions (user_id, read_on DESC);
