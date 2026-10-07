/*
# Family events

## Purpose
Backs the Family Calendar: ceremonies (Aqiqah, Nikah, Walima), Eid
gatherings, birthdays, school events and appointments. Birthdays from
`family_members` and key Islamic dates are added automatically in the app,
so they don't need rows here.

## Columns of note
- `kind`        event type used for colour and icon
- `starts_on`   calendar date; `start_time` / `end_time` are optional
- `member_ids`  family_members involved (ids from public.family_members)
- `repeats_yearly`  e.g. anniversaries

## Security
RLS; owner-scoped policies (auth.uid() = user_id).
*/

CREATE TABLE IF NOT EXISTS public.family_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  kind            text NOT NULL DEFAULT 'other'
                  CHECK (kind IN ('eid', 'aqiqah', 'nikah', 'walima', 'birthday', 'anniversary',
                                  'school', 'appointment', 'gathering', 'islamic', 'other')),
  starts_on       date NOT NULL,
  start_time      time,
  end_time        time,
  location        text CHECK (location IS NULL OR char_length(location) <= 200),
  notes           text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  member_ids      uuid[] NOT NULL DEFAULT '{}',
  repeats_yearly  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_events_select_own" ON public.family_events;
CREATE POLICY "family_events_select_own" ON public.family_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "family_events_insert_own" ON public.family_events;
CREATE POLICY "family_events_insert_own" ON public.family_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "family_events_update_own" ON public.family_events;
CREATE POLICY "family_events_update_own" ON public.family_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "family_events_delete_own" ON public.family_events;
CREATE POLICY "family_events_delete_own" ON public.family_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_family_events_user_date ON public.family_events (user_id, starts_on);
