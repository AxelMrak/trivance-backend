-- Create roles table and user_roles pivot
CREATE TABLE IF NOT EXISTS roles (
  level INT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Create user_roles without FK to users to avoid ordering issues; add FK later if users exists
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL,
  role_level INT NOT NULL REFERENCES roles(level) ON DELETE RESTRICT,
  PRIMARY KEY (user_id)
);

-- Seed base roles
INSERT INTO roles (level, name) VALUES
  (0, 'GUEST'),
  (1, 'CLIENT'),
  (2, 'STAFF'),
  (3, 'MANAGER'),
  (4, 'ADMIN'),
  (5, 'SUPER_USER')
ON CONFLICT (level) DO NOTHING;

-- Conditionally add FK to users and backfill from users.role when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    -- Add FK if not already present
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND constraint_name = 'fk_user_roles_user'
    ) THEN
      ALTER TABLE user_roles
        ADD CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Backfill pivot from users.role if pivot is empty for that user
    INSERT INTO user_roles (user_id, role_level)
    SELECT u.id, u.role
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.user_id IS NULL AND u.role IS NOT NULL;
  END IF;
END $$;
