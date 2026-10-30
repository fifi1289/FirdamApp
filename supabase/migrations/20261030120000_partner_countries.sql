-- Where partners are and who they deliver to / serve, so families see the
-- partners that can reach them (and can still browse other countries).
--   country            ISO code of where the business is based (e.g. 'CA')
--   ships_mode         'country'   = my country only
--                      'countries' = my country + ship_countries
--                      'worldwide' = everywhere except exclude_countries
--   works              services & learning only: 'online', 'in_person' or 'both'

ALTER TABLE public.partner_shops
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'CA',
  ADD COLUMN IF NOT EXISTS ships_mode text NOT NULL DEFAULT 'country',
  ADD COLUMN IF NOT EXISTS ship_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exclude_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS works text;

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS ships_mode text,
  ADD COLUMN IF NOT EXISTS ship_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exclude_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS works text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_shops_ships_mode_check') THEN
    ALTER TABLE public.partner_shops ADD CONSTRAINT partner_shops_ships_mode_check CHECK (ships_mode IN ('country', 'countries', 'worldwide'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_shops_works_check') THEN
    ALTER TABLE public.partner_shops ADD CONSTRAINT partner_shops_works_check CHECK (works IS NULL OR works IN ('online', 'in_person', 'both'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_shops_country_check') THEN
    ALTER TABLE public.partner_shops ADD CONSTRAINT partner_shops_country_check CHECK (country ~ '^[A-Z]{2}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_applications_ships_mode_check') THEN
    ALTER TABLE public.partner_applications ADD CONSTRAINT partner_applications_ships_mode_check CHECK (ships_mode IS NULL OR ships_mode IN ('country', 'countries', 'worldwide'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_applications_works_check') THEN
    ALTER TABLE public.partner_applications ADD CONSTRAINT partner_applications_works_check CHECK (works IS NULL OR works IN ('online', 'in_person', 'both'));
  END IF;
END $$;

-- MANAGYT works online for clients anywhere.
UPDATE public.partner_shops SET ships_mode = 'worldwide', works = 'online' WHERE name ILIKE 'MANAGYT%';
