-- "How to make it" for each lunchbox idea, in English, French and Arabic:
-- {"en": ["step", …], "fr": […], "ar": […]}. Written once per idea by the
-- lunchbox-steps function (run by the hourly "lunchbox-library" job).
ALTER TABLE public.lunchbox_ideas ADD COLUMN IF NOT EXISTS steps jsonb;
