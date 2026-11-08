-- Daily gold and silver prices per gram for the zakat calculator, one row per
-- currency per day, written by the metal-prices function (service role only).
CREATE TABLE IF NOT EXISTS public.metal_prices (
  day        date NOT NULL,
  currency   text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  gold       numeric NOT NULL CHECK (gold > 0),
  silver     numeric NOT NULL CHECK (silver > 0),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, currency)
);
ALTER TABLE public.metal_prices ENABLE ROW LEVEL SECURITY;
