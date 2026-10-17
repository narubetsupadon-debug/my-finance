-- Provider preference only: existing records use automatic matching (NULL).
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS logo_key text
  CONSTRAINT debts_logo_key_check
  CHECK (logo_key IS NULL OR logo_key IN ('grab','lazada','shopee','kbank','ttb','firstchoice','none'));
NOTIFY pgrst, 'reload schema';
