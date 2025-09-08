-- Add client_id to appointments and backfill
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);

-- Backfill: when the creator is also a client, set client_id accordingly
UPDATE appointments a
SET client_id = c.id
FROM clients c
WHERE a.client_id IS NULL AND c.user_id = a.user_id;

