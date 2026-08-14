-- Add payment amount/currency to orders for Mercado Pago webhook validation
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount numeric(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency varchar(3);

-- Backfill amount/currency from the appointment's service price
UPDATE orders o
SET amount = s.price, currency = 'ARS'
FROM appointments a
JOIN services s ON s.id = a.service_id
WHERE o.appointment_id = a.id AND o.amount IS NULL;

-- Payment event ledger for webhook idempotency and audit
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL UNIQUE,
  order_id uuid REFERENCES orders ON DELETE SET NULL,
  event text NOT NULL,
  status text,
  raw jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);