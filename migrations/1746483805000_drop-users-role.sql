-- Normalize roles: drop redundant column users.role (using pivot user_roles)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    -- Drop dependent index if exists
    BEGIN
      DROP INDEX IF EXISTS users_role_idx;
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
    ALTER TABLE users DROP COLUMN role;
  END IF;
END $$;

