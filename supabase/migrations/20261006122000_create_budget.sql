/*
# Budget

## Purpose
Backs the Budget module: monthly category budgets, income and expense
tracking, sadaqah and zakat records, and savings goals (Hajj, Umrah, Eid,
education, emergency fund…).

## Tables
- `budget_categories`  spending categories with an optional monthly limit
- `budget_transactions` income, expenses, sadaqah and zakat entries
- `savings_goals`      goals with a target and the amount saved so far

## Security
RLS on every table; all policies are owner-scoped (auth.uid() = user_id).
Amounts are stored as numeric(14,2) and must be positive.
*/

CREATE TABLE IF NOT EXISTS public.budget_categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  icon           text NOT NULL DEFAULT 'wallet',
  monthly_limit  numeric(14,2) CHECK (monthly_limit IS NULL OR monthly_limit >= 0),
  position       integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budget_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('income', 'expense', 'sadaqah', 'zakat')),
  amount       numeric(14,2) NOT NULL CHECK (amount > 0),
  category_id  uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  description  text CHECK (description IS NULL OR char_length(description) <= 200),
  occurred_on  date NOT NULL DEFAULT current_date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.savings_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kind         text NOT NULL DEFAULT 'general'
               CHECK (kind IN ('general', 'hajj', 'umrah', 'eid', 'education', 'emergency', 'home', 'wedding')),
  target       numeric(14,2) NOT NULL CHECK (target > 0),
  saved        numeric(14,2) NOT NULL DEFAULT 0 CHECK (saved >= 0),
  target_date  date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['budget_categories', 'budget_transactions', 'savings_goals'] LOOP
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

CREATE INDEX IF NOT EXISTS idx_budget_categories_user ON public.budget_categories (user_id, position);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_user_date ON public.budget_transactions (user_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals (user_id, created_at);
