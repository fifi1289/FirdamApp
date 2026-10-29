-- Services: Muslim-owned local businesses (renovation, accountants, catering…)
-- use the partner system with their own category, and can show a phone number.
ALTER TABLE public.partner_shops DROP CONSTRAINT IF EXISTS partner_shops_department_check;
ALTER TABLE public.partner_shops ADD CONSTRAINT partner_shops_department_check
  CHECK (department IN ('groceries', 'household', 'clothing', 'kids', 'gifts', 'learning', 'services'));
ALTER TABLE public.partner_shops ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.partner_shops DROP CONSTRAINT IF EXISTS partner_shops_phone_check;
ALTER TABLE public.partner_shops ADD CONSTRAINT partner_shops_phone_check CHECK (phone IS NULL OR char_length(phone) <= 30);

ALTER TABLE public.partner_applications DROP CONSTRAINT IF EXISTS partner_applications_department_check;
ALTER TABLE public.partner_applications ADD CONSTRAINT partner_applications_department_check
  CHECK (department IN ('groceries', 'household', 'clothing', 'kids', 'gifts', 'learning', 'services'));
