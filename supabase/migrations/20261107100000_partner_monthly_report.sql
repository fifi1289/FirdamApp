-- Monthly partner report: on the 1st of each month the database calls the
-- partner-monthly-report function, which emails every active partner how many
-- families tapped through to them last month (numbers only).
--
-- The token that lets the scheduler call the function lives only in Supabase
-- Vault (secret "partner_report_token"), created once by hand:
--   select vault.create_secret('<random token>', 'partner_report_token');

CREATE OR REPLACE FUNCTION public.check_partner_report_token(p_token text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v text;
BEGIN
  SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'partner_report_token';
  RETURN v IS NOT NULL AND length(v) >= 32 AND p_token = v;
END $$;
REVOKE ALL ON FUNCTION public.check_partner_report_token(text) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.check_partner_report_token(text) FROM anon, authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.check_partner_report_token(text) TO service_role;
  END IF;
END $$;

-- Scheduling needs pg_cron and pg_net (available on Supabase, not in plain Postgres).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'partner-monthly-report';
    -- 15:07 UTC on the 1st = about 10:07 am in Toronto.
    PERFORM cron.schedule(
      'partner-monthly-report',
      '7 15 1 * *',
      $job$
        SELECT net.http_post(
          url := 'https://psxwslmsjdtfzneoujea.supabase.co/functions/v1/partner-monthly-report',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-report-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'partner_report_token')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 60000
        );
      $job$
    );
  END IF;
END $$;
