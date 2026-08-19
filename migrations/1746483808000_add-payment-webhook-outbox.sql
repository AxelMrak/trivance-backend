-- Transactional outbox for Mercado Pago webhooks.
-- Webhooks are durably persisted here BEFORE the HTTP 200 is returned, then
-- processed asynchronously by the in-process worker with retry/backoff.
-- Retry state is modeled via attempts + available_at + status='pending'
-- (no separate 'failed' status). dead_letter = exhausted attempts or a
-- permanent failure.
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  payment_id text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending | processed | dead_letter
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, payment_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_claim
  ON payment_webhook_events (status, available_at, created_at)
  WHERE status = 'pending';
