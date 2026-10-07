/*
# Health and Learning

- `habits` / `habit_logs`   daily healthy and sunnah habits with streaks
- `health_records`          appointments, vaccinations, allergies,
                            medications and notes for each family member
- `learning_goals`          goals for each family member (e.g. memorise a
                            surah, learn the Arabic alphabet)
- `learning_sessions`       time spent towards a goal

All tables are private to their owner (auth.uid() = user_id).
*/

CREATE TABLE IF NOT EXISTS public.habits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kind         text NOT NULL DEFAULT 'health' CHECK (kind IN ('health', 'sunnah', 'faith', 'other')),
  icon         text NOT NULL DEFAULT 'sparkles',
  days         smallint[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  archived     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  habit_id    uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date    date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.health_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id    uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  kind         text NOT NULL CHECK (kind IN ('appointment', 'vaccination', 'allergy', 'medication', 'condition', 'measurement', 'note')),
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  record_date  date,
  next_date    date,
  details      text CHECK (details IS NULL OR char_length(details) <= 2000),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id    uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  kind         text NOT NULL DEFAULT 'quran' CHECK (kind IN ('quran', 'arabic', 'islamic_studies', 'school', 'skill', 'other')),
  progress     smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  due_date     date,
  notes        text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  completed    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id     uuid NOT NULL REFERENCES public.learning_goals(id) ON DELETE CASCADE,
  minutes     integer NOT NULL CHECK (minutes BETWEEN 1 AND 600),
  note        text CHECK (note IS NULL OR char_length(note) <= 300),
  logged_on   date NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['habits', 'habit_logs', 'health_records', 'learning_goals', 'learning_sessions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
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

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_user ON public.health_records (user_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_learning_goals_user ON public.learning_goals (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_goal ON public.learning_sessions (goal_id, logged_on DESC);
