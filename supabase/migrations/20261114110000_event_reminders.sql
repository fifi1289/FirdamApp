-- Each family event can choose its own reminders (null = Firdam's default:
-- the evening before, and an hour before or that morning).
ALTER TABLE public.family_events
  ADD COLUMN IF NOT EXISTS reminders text[]
  CHECK (reminders IS NULL OR reminders <@ ARRAY['at', '15m', '1h', '1d', '1w']::text[]);
