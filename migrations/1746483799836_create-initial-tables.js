/**
 * @param pgm {MigrationBuilder}
 * @returns {Promise<void> | void}
 */
module.exports.up = (pgm) => {
  pgm.createExtension("uuid-ossp", { ifNotExists: true });

  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('invited', 'client', 'staff', 'manager', 'admin', 'superuser');
      END IF;
    END $$;
  `);

  pgm.createTable("companies", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    name: { type: "varchar(100)", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });

  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    company_id: {
      type: "uuid",
      notNull: true,
      references: "companies",
      onDelete: "CASCADE",
    },
    name: { type: "text", notNull: true },
    email: { type: "text", notNull: true, unique: true },
    password: { type: "text", notNull: true },
    role: {
      type: "user_role",
      notNull: true,
      default: "client",
    },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });
};

/**
 * @param pgm {MigrationBuilder}
 * @returns {Promise<void> | void}
 */
module.exports.down = (pgm) => {
  pgm.dropTable("users");
  pgm.dropTable("companies");
  pgm.sql(`DROP TYPE IF EXISTS user_role`);
  pgm.dropExtension("uuid-ossp");
};
