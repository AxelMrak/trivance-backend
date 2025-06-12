/**
 * @param pgm {MigrationBuilder}
 * @returns {Promise<void> | void}
 */
module.exports.up = (pgm) => {
  pgm.createExtension("uuid-ossp", { ifNotExists: true });

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
    phone: { type: "text", notNull: true },
    address: { type: "text", notNull: true },
    role: {
      type: "int",
      notNull: true,
      default: 0,
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
    duration: { type: "interval", notNull: true },
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

  pgm.createType("appointment_status", ["pending", "confirmed", "cancelled"]);
  pgm.createTable("appointments", {
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
    service_id: {
      type: "uuid",
      notNull: true,
      references: "services",
      onDelete: "CASCADE",
    },
    status: {
      type: "appointment_status",
      notNull: true,
      default: "pending",
    },
    time: {
      type: "varchar(5)",
      notNull: true,
    },
    end_date: {
      type: "timestamp",
      notNull: true,
    },
    created_at: { type: "timestamp", default: pgm.func("now()") },
    updated_at: { type: "timestamp", default: pgm.func("now()") },
    description: { type: "varchar(3000)" },
    start_date: { type: "timestamp", notNull: true },
  });

  pgm.createIndex("companies", "name", { unique: true });
  pgm.createIndex("users", "company_id");
  pgm.createIndex("users", "role");
  pgm.createIndex("sessions", "user_id");
  pgm.createIndex("services", "company_id");
  pgm.createIndex("services", "id", { unique: true });
  pgm.createIndex("appointments", "user_id");
  pgm.createIndex("appointments", "service_id");
  pgm.createIndex("appointments", "start_date");
  pgm.createIndex("appointments", "status");
  pgm.createIndex("appointments", ["user_id", "start_date", "service_id"]);
};

/**
 * @param pgm {MigrationBuilder}
 * @returns {Promise<void> | void}
 */
module.exports.down = (pgm) => {
  pgm.dropIndex("services");
  pgm.dropTable("appointments");
  pgm.dropType("appointment_status");
  pgm.dropTable("sessions");
  pgm.dropTable("services");
  pgm.dropTable("users");
  pgm.dropTable("companies");
  pgm.dropExtension("uuid-ossp");
};
