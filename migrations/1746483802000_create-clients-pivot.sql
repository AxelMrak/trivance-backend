-- Create clients pivot table to normalize client concept away from users
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Backfill clients from existing users with CLIENT role
INSERT INTO clients (user_id)
SELECT u.id
FROM users u
LEFT JOIN clients c ON c.user_id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE c.user_id IS NULL AND (
  (ur.role_level = 1) OR (ur.role_level IS NULL AND u.role = 1)
);
