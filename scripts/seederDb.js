const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { randomUUID } = require("crypto");

dotenv.config();

// ───── Constants ─────

const TRIVANCE_NAME = "Trivance";
const TRIVANCE_ID = "6f299074-dc4c-47b7-9aed-4683fb29d97e";

const OTHER_COMPANIES = [{ name: "NovaTech Solutions" }, { name: "BlueHorizon Ltd" }];

const femaleNames = [
  "Valeria",
  "Lucía",
  "Camila",
  "Julieta",
  "Sofía",
  "Mariana",
  "Paula",
  "Daniela",
  "Florencia",
  "Gabriela",
  "Martina",
  "Isabella",
  "Renata",
  "Emilia",
  "Clara",
];

// Role enum mapping
const roleMap = {
  0: "Invitada", // GUEST
  1: "Cliente", // CLIENT
  2: "Esteticista", // STAFF
  3: "Encargada", // MANAGER
  4: "Administradora", // ADMIN
  5: "Superadmin", // SUPER_USER
};

// Superuser emails
const superUserEmails = [
  "julian99skate@gmail.com",
  "nacho301011@gmail.com",
  "agustin2015.castillo@gmail.com",
  "nahuposebon@gmail.com",
  "lautaro.ajrz@gmail.com",
  "axel@test.com",
];

// Users list (superusers first)
const users = superUserEmails.map((email) => ({
  name: `${email.split("@")[0]} - ${roleMap[5]}`,
  email: email.trim().toLowerCase(),
  password: "password",
  role: 5,
  phone: "1234567890",
  address: "123 San Martín, Mendoza, Argentina",
}));

// Add 2 female users for each role from 0 to 4
[0, 1, 2, 3, 4].forEach((role) => {
  for (let i = 0; i < 2; i++) {
    const firstName = femaleNames[Math.floor(Math.random() * femaleNames.length)];
    const roleName = roleMap[role];
    const slug = roleName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const email = `${firstName.toLowerCase()}.${slug}${i}@example.com`.replace(/\s+/g, "");
    const name = `${firstName} - ${roleName}`;

    users.push({
      name,
      email,
      password: "password",
      role,
      phone: `11${Math.floor(10000000 + Math.random() * 89999999)}`,
      address: "456 Belgrano, Córdoba, Argentina",
    });
  }
});

const services = [
  {
    name: "Limpieza Facial Profunda",
    description: "Tratamiento de limpieza intensiva para todo tipo de piel.",
    duration: "1 hour",
    price: 100.0,
  },
  {
    name: "Masaje Relajante",
    description: "Masaje corporal para reducir estrés y tensión muscular.",
    duration: "1 hour",
    price: 80.0,
  },
  {
    name: "Depilación Láser",
    description: "Eliminación de vello con tecnología láser.",
    duration: "30 mins",
    price: 120.0,
  },
];

const appointmentStatuses = ["pending", "confirmed", "cancelled"];

// ───── Helpers ─────

const getRandomDate = () => {
  const now = new Date();
  const start = new Date(now.getTime() + Math.random() * 10 * 86400000);
  return start.toISOString();
};

// ───── DB Setup ─────

const client = new Client({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres:postgres@trivance-db:5432/trivance_db",
});

// ───── Seeder Functions ─────

async function seedCompanies() {
  const trivanceExists = await client.query(`SELECT 1 FROM companies WHERE id = $1`, [TRIVANCE_ID]);
  if (!trivanceExists.rowCount) {
    await client.query(`INSERT INTO companies (id, name) VALUES ($1, $2)`, [
      TRIVANCE_ID,
      TRIVANCE_NAME,
    ]);
    console.log(`➕ Created company "${TRIVANCE_NAME}"`);
  }

  for (const { name } of OTHER_COMPANIES) {
    const existing = await client.query(`SELECT 1 FROM companies WHERE name = $1`, [name]);
    if (!existing.rowCount) {
      await client.query(`INSERT INTO companies (id, name) VALUES ($1, $2)`, [randomUUID(), name]);
      console.log(`➕ Created company "${name}"`);
    }
  }
}

async function seedUsers() {
  const existingEmails = await client.query(`SELECT email FROM users WHERE email = ANY($1)`, [
    users.map((u) => u.email),
  ]);
  const existingSet = new Set(existingEmails.rows.map((r) => r.email));
  const insertedIds = [];

  for (const user of users) {
    if (existingSet.has(user.email)) {
      console.log(`↩️ Skipping user (already exists): ${user.email}`);
      continue;
    }

    const hashed = bcrypt.hashSync(user.password, 10);
    const id = randomUUID();

    await client.query(
      `INSERT INTO users (id, company_id, name, email, password, role, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, TRIVANCE_ID, user.name, user.email, hashed, user.role, user.phone, user.address],
    );

    insertedIds.push(id);
    console.log(`➕ Inserted user: ${user.email}`);
  }

  return insertedIds;
}

async function seedServices() {
  const existing = await client.query(`SELECT name FROM services WHERE company_id = $1`, [
    TRIVANCE_ID,
  ]);
  const existingNames = new Set(existing.rows.map((s) => s.name));
  const inserted = new Map();

  for (const s of services) {
    if (existingNames.has(s.name)) {
      console.log(`↩️ Skipping service: ${s.name}`);
      continue;
    }

    const id = randomUUID();
    await client.query(
      `INSERT INTO services (id, company_id, name, description, duration, price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, TRIVANCE_ID, s.name, s.description, s.duration, s.price],
    );
    inserted.set(s.name, id);
    console.log(`➕ Inserted service: ${s.name}`);
  }

  return inserted;
}

async function seedAppointments(userIds, serviceIds) {
  for (let i = 0; i < 10; i++) {
    const userId = userIds[i % userIds.length];
    const serviceId = serviceIds[i % serviceIds.length];
    const status = appointmentStatuses[i % appointmentStatuses.length];
    const startDate = getRandomDate();

    await client.query(
      `INSERT INTO appointments (id, user_id, service_id, status, start_date, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), userId, serviceId, status, startDate, `Turno automático ${i + 1}`],
    );

    console.log(`➕ Inserted appointment ${i + 1}`);
  }
}

// ───── Main Seeder ─────

async function seedDb() {
  try {
    await client.connect();
    console.log("✅ Connected to database");
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query("BEGIN");

    await seedCompanies();
    const userIds = await seedUsers();
    const serviceMap = await seedServices();
    const serviceIds = Array.from(serviceMap.values());
    await seedAppointments(userIds, serviceIds);

    await client.query("COMMIT");
    console.log("🎉 Seeding completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    await client.query("ROLLBACK");
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDb();
