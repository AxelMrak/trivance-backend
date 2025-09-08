-- Normalize clients table to be standalone and optional link to users
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company_id UUID NULL REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ALTER COLUMN user_id DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_email_company ON clients(email, company_id);

-- Backfill fields from users for existing client records with user_id
UPDATE clients c
SET name = u.name,
    email = u.email,
    phone = u.phone,
    address = u.address,
    company_id = u.company_id
FROM users u
WHERE c.user_id = u.id AND (c.name IS NULL OR c.email IS NULL OR c.company_id IS NULL);

