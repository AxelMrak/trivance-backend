-- Add contact fields to clients and backfill from linked users
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Backfill contact fields from linked users when available
UPDATE clients c
SET contact_email = COALESCE(c.contact_email, u.email),
    contact_phone = COALESCE(c.contact_phone, u.phone)
FROM users u
WHERE c.user_id = u.id;

