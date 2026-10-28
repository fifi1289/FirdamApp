-- Learning partners (Quran teachers, Arabic classes, Islamic schools) use the
-- partner system with their own category, and can list what they teach.
ALTER TABLE public.partner_shops DROP CONSTRAINT IF EXISTS partner_shops_department_check;
ALTER TABLE public.partner_shops ADD CONSTRAINT partner_shops_department_check
  CHECK (department IN ('groceries', 'household', 'clothing', 'kids', 'gifts', 'learning'));
ALTER TABLE public.partner_shops ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.partner_shops DROP CONSTRAINT IF EXISTS partner_shops_topics_check;
ALTER TABLE public.partner_shops ADD CONSTRAINT partner_shops_topics_check CHECK (cardinality(topics) <= 6);

ALTER TABLE public.partner_applications DROP CONSTRAINT IF EXISTS partner_applications_department_check;
ALTER TABLE public.partner_applications ADD CONSTRAINT partner_applications_department_check
  CHECK (department IN ('groceries', 'household', 'clothing', 'kids', 'gifts', 'learning'));
