/**
 * @param {MigrationBuilder} pgm
 * @returns {Promise<void> | void}
 */
module.exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────
  // Extensions and Custom Types
  // ─────────────────────────────────────────────────────
  pgm.createExtension("uuid-ossp", { ifNotExists: true });

  pgm.createType("order_status", ["pending", "paid", "cancelled", "failed"]);
  pgm.createType("appointment_status", ["pending", "confirmed", "cancelled"]);

  // ─────────────────────────────────────────────────────
  // Companies
  // ─────────────────────────────────────────────────────
  pgm.createTable("companies", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    name: { type: "varchar(100)", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  // ─────────────────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────────────────
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
    role: { type: "int", notNull: true, default: 0 },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  // ─────────────────────────────────────────────────────
  // Services
  // ─────────────────────────────────────────────────────
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
    requires_deposit: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  // ─────────────────────────────────────────────────────
  // Sessions
  // ─────────────────────────────────────────────────────
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
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  // ─────────────────────────────────────────────────────
  // Appointments
  // ─────────────────────────────────────────────────────
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
    description: { type: "varchar(3000)" },
    start_date: { type: "timestamp", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  // ─────────────────────────────────────────────────────
  // Orders
  // ─────────────────────────────────────────────────────
  pgm.createTable("orders", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    appointment_id: {
      type: "uuid",
      notNull: true,
      references: "appointments",
      onDelete: "CASCADE",
    },
    provider: { type: "text", notNull: true },
    reference_id: { type: "text", notNull: true },
    status: {
      type: "order_status",
      notNull: true,
      default: "pending",
    },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  // ─────────────────────────────────────────────────────
  // Indexes
  // ─────────────────────────────────────────────────────
  pgm.createIndex("companies", "name", { unique: true });

  pgm.createIndex("users", ["company_id", "role"]);

  pgm.createIndex("sessions", "user_id");

  pgm.createIndex("services", ["company_id", "id"], { unique: true });

  pgm.createIndex("appointments", ["user_id", "start_date"]);
  pgm.createIndex("appointments", "service_id");
  pgm.createIndex("appointments", "status");

  pgm.createIndex("orders", "appointment_id");
  pgm.createIndex("orders", "provider");
  pgm.createIndex("orders", "reference_id", { unique: true });
};

/**
 * @param {MigrationBuilder} pgm
 * @returns {Promise<void> | void}
 */
module.exports.down = (pgm) => {
  // ─────────────────────────────────────────────────────
  // Drop Indexes
  // ─────────────────────────────────────────────────────
  pgm.dropIndex("orders", "reference_id");
  pgm.dropIndex("orders", "provider");
  pgm.dropIndex("orders", "appointment_id");

  pgm.dropIndex("appointments", "status");
  pgm.dropIndex("appointments", "service_id");
  pgm.dropIndex("appointments", ["user_id", "start_date"]);

  pgm.dropIndex("services", ["company_id", "id"]);

  pgm.dropIndex("sessions", "user_id");

  pgm.dropIndex("users", ["company_id", "role"]);

  pgm.dropIndex("companies", "name");

  // ─────────────────────────────────────────────────────
  // Drop Tables & Types
  // ─────────────────────────────────────────────────────
  pgm.dropTable("orders");
  pgm.dropTable("appointments");
  pgm.dropTable("sessions");
  pgm.dropTable("services");
  pgm.dropTable("users");
  pgm.dropTable("companies");

  pgm.dropType("appointment_status");
  pgm.dropType("order_status");
  pgm.dropExtension("uuid-ossp");
};
