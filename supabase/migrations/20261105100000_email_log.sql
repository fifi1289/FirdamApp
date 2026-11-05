-- Emails sent from Firdam's address by the send-email function (Admin → Partners → Send email).
CREATE TABLE IF NOT EXISTS public.email_log (
  id             bigserial PRIMARY KEY,
  to_email       text NOT NULL,
  from_email     text NOT NULL,
  subject        text NOT NULL,
  body           text NOT NULL,
  sent_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  application_id uuid,
  provider_id    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_log_application_idx ON public.email_log (application_id, created_at DESC);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_log_admin_read ON public.email_log;
CREATE POLICY email_log_admin_read ON public.email_log FOR SELECT TO authenticated USING (public.is_admin());
