/**
 * @param pgm {MigrationBuilder}
 * @returns {Promise<void> | void}
 */
module.exports.up = (pgm) => {
  pgm.createExtension("uuid-ossp", { ifNotExists: true });

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
    phone: { type: "text", notNull: true },
    address: { type: "text", notNull: true },
    role: {
      type: "user_role",
      notNull: true,
      default: "GUEST",
    },
    created_at: { type: "timestamp", default: pgm.func("now()") },
    updated_at: { type: "timestamp", default: pgm.func("now()") },
  });

  pgm.createTable("services", {
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
    description: { type: "text" },
    duration: { type: "interval", notNull: true }, // Se puede usar TIME para una duración fija
    price: { type: "numeric(10, 2)" },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });

  pgm.createTable("sessions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    token: { type: "text", notNull: true, unique: true },
    user_agent: { type: "text", notNull: true },
    ip_address: { type: "text", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });

  pgm.createIndex("companies", "name", { unique: true });
  pgm.createIndex("users", "company_id");
  pgm.createIndex("users", "role");
  pgm.createIndex("sessions", "user_id");
  pgm.createIndex("sessions", "created_at");
  pgm.createIndex("services", "company_id");
};

/**
 * @param pgm {MigrationBuilder}
 * @returns {Promise<void> | void}
 */
module.exports.down = (pgm) => {
  pgm.dropIndex("services");
  pgm.dropTable("sessions");
  pgm.dropTable("users");
  pgm.dropTable("companies");
  pgm.sql(`DROP TYPE IF EXISTS user_role`);
  pgm.dropExtension("uuid-ossp");
};
