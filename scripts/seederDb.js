const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { randomUUID } = require("crypto");
// TODO: Clear db before seeding
dotenv.config();

const client = new Client({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres:postgres@trivance-db:5432/trivance_db",
});

const TRIVANCE_NAME = "Trivance";
const TRIVANCE_ID = "6f299074-dc4c-47b7-9aed-4683fb29d97e";

const OTHER_COMPANIES = [{ name: "NovaTech Solutions" }, { name: "BlueHorizon Ltd" }];

const initialUsers = [
  "maria.gonzalez@example.com",
  "juan.perez@example.com",
  "sofia.lopez@example.com",
  "lucas.fernandez@example.com",
];

const rolesToSeed = [1]; // Only clients
const STAFF_COUNT = 2;
const femaleNames = [
  "Valeria",
  "Camila",
  "Carolina",
  "Claudia",
  "Clara",
  "Florencia",
  "Lucía",
  "María",
  "Ana",
  "Sofía",
  "Valentina",
  "Victoria",
  "Gabriela",
  "Isabella",
  "Martina",
  "Juliana",
  "Renata",
  "Emilia",
  "Daniela",
  "Paula",
  "Elena",
  "Marta",
];
const users = initialUsers.map((email) => {
  const name = email.split("@")[0];
  return {
    name,
    email,
    password: "password",
    role: 5,
    phone: "1234567890",
    address: "123 San Martin, Mendoza, Argentina",
  };
});

for (const role of rolesToSeed) {
  const fname = femaleNames[Math.floor(Math.random() * femaleNames.length)];
  users.push({
    name: `${fname} ${Math.random() > 0.5 ? "García" : "Rodríguez"}`,
    email: `${fname.toLowerCase()}${Math.floor(Math.random() * 1000 + 1)}@cliente.com.ar`,
    password: "password",
    role,
    phone: `11${Math.floor(10000000 + Math.random() * 89999999)}`,
    address: `${Math.floor(100 + Math.random() * 900)} Av. Belgrano, CABA, Argentina`,
  });
}

const services = [
  {
    name: "limpieza facial profunda",
    description: "tratamiento de limpieza intensiva para todo tipo de piel.",
    duration: "01:00:00",
    price: 100.0,
  },
  {
    name: "masaje relajante",
    description: "masaje corporal para reducir estrés y tensión muscular.",
    duration: "01:00:00",
    price: 80.0,
  },
  {
    name: "depilación láser",
    description: "eliminación de vello con tecnología láser.",
    duration: "00:30:00",
    price: 120.0,
  },
  {
    name: "tratamiento anticelulítico",
    description: "mejora la apariencia de la piel con técnicas reafirmantes.",
    duration: "01:30:00",
    price: 150.0,
  },
  {
    name: "microdermoabrasión",
    description: "exfoliación para regenerar la piel.",
    duration: "00:45:00",
    price: 110.0,
  },
  {
    name: "radiofrecuencia facial",
    description: "reafirmación de la piel del rostro.",
    duration: "01:00:00",
    price: 130.0,
  },
  {
    name: "manicura y pedicura",
    description: "servicio completo de uñas para manos y pies.",
    duration: "02:00:00",
    price: 90.0,
  },
  {
    name: "spa de pies",
    description: "hidratación y relajación profunda para los pies.",
    duration: "01:00:00",
    price: 70.0,
  },
  {
    name: "pestañas 3d",
    description: "extensiones de pestañas con efecto volumen.",
    duration: "01:30:00",
    price: 140.0,
  },
  {
    name: "perfilado de cejas",
    description: "diseño y depilación de cejas personalizado.",
    duration: "00:30:00",
    price: 60.0,
  },
];

const statuses = ["pending", "confirmed", "cancelled"];

const getRandomDateRange = () => {
  const now = new Date();
  const start = new Date(now.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000); // within 10 days
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour later
  return { start_date: start.toISOString(), end_date: end.toISOString() };
};

const seedDb = async () => {
  try {
    await client.connect();
    console.log("✅ Connected to the database");

    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query("BEGIN");

    const { rows: trivanceRows } = await client.query(`SELECT id FROM companies WHERE id = $1`, [
      TRIVANCE_ID,
    ]);

    if (!trivanceRows.length) {
      await client.query(`INSERT INTO companies (id, name) VALUES ($1, $2)`, [
        TRIVANCE_ID,
        TRIVANCE_NAME,
      ]);
      console.log(`➕ Created company "${TRIVANCE_NAME}"`);
    } else {
      console.log(`ℹ️ Company "${TRIVANCE_NAME}" already exists`);
    }

    for (const company of OTHER_COMPANIES) {
      const { rows } = await client.query(`SELECT id FROM companies WHERE name = $1`, [
        company.name,
      ]);

      if (!rows.length) {
        await client.query(`INSERT INTO companies (id, name) VALUES ($1, $2)`, [
          randomUUID(),
          company.name,
        ]);
        console.log(`➕ Created company "${company.name}"`);
      } else {
        console.log(`↩️ Company "${company.name}" already exists`);
      }
    }

    // Ensure base roles exist (ignore if roles table is missing)
    try {
      await client.query(
        `INSERT INTO roles (level, name) VALUES
          (0, 'GUEST'), (1, 'CLIENT'), (2, 'STAFF'), (3, 'MANAGER'), (4, 'ADMIN'), (5, 'SUPER_USER')
         ON CONFLICT (level) DO NOTHING`,
      );
    } catch {}

    const { rows: existingUserRows } = await client.query(
      `SELECT email FROM users WHERE email = ANY($1)`,
      [users.map((u) => u.email)],
    );
    const existingEmails = new Set(existingUserRows.map((r) => r.email));

    const insertedUserIds = [];

    for (const user of users) {
      if (existingEmails.has(user.email)) {
        console.log(`↩️ Skipping existing user: ${user.email}`);
        continue;
      }

      const id = randomUUID();
      const hashed = bcrypt.hashSync(user.password, 10);
      await client.query(
        `INSERT INTO users (
          id, company_id, name, email, password, phone, address
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )`,
        [id, TRIVANCE_ID, user.name, user.email, hashed, user.phone, user.address],
      );
      insertedUserIds.push(id);
      try {
        await client.query(
          `INSERT INTO user_roles (user_id, role_level) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
          [id, user.role],
        );
      } catch {}
      try {
        // Create clients entry only for CLIENT role users
        if (user.role === 1) {
          await client.query(
            `INSERT INTO clients (user_id, company_id, name, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id) DO NOTHING`,
            [id, TRIVANCE_ID, user.name, user.email, user.phone, user.address],
          );
        }
      } catch {}
      console.log(`➕ Inserted user: ${user.email}`);
    }

    const { rows: serviceRows } = await client.query(
      `SELECT id, name FROM services WHERE company_id = $1`,
      [TRIVANCE_ID],
    );
    const serviceMap = new Map(serviceRows.map((s) => [s.name, s.id]));

    // Add extra realistic services
    const extraServices = [
      { name: "Corte de cabello", description: "Corte profesional unisex.", duration: "00:45:00", price: 50.0 },
      { name: "Coloración", description: "Color completo o retoque de raíz.", duration: "02:00:00", price: 180.0 },
      { name: "Masaje descontracturante", description: "Alivia tensiones y contracturas.", duration: "01:00:00", price: 95.0 },
    ];
    const allServices = [...services, ...extraServices];

    for (const service of allServices) {
      if (serviceMap.has(service.name)) {
        console.log(`↩️ Skipping existing service: ${service.name}`);
        continue;
      }

      const id = randomUUID();
      await client.query(
        `INSERT INTO services (
          id, company_id, name, description, duration, price
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )`,
        [id, TRIVANCE_ID, service.name, service.description, service.duration, service.price],
      );
      serviceMap.set(service.name, id);
      console.log(`➕ Inserted service: ${service.name}`);
    }

    // Create some staff users
    const staffUsers = [];
    for (let i = 0; i < STAFF_COUNT; i++) {
      const id = randomUUID();
      const name = `Staff ${i + 1}`;
      const email = `staff${i + 1}@empresa.com`;
      const hashed = bcrypt.hashSync("password", 10);
      await client.query(
        `INSERT INTO users (id, company_id, name, email, password, phone, address) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, TRIVANCE_ID, name, email, hashed, `11${Math.floor(10000000 + Math.random() * 89999999)}`, `Oficina ${i + 1}, CABA`],
      );
      await client.query(
        `INSERT INTO user_roles (user_id, role_level) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
        [id, 2],
      );
      staffUsers.push(id);
      console.log(`➕ Inserted staff user: ${email}`);
    }

    // Insert appointments
    // Use only CLIENTS as subjects, but mix creators (some staff creating on behalf of clients)
    const userIds = (
      await client.query(
        `SELECT u.id
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         WHERE u.company_id = $1 AND ur.role_level = 1`,
        [TRIVANCE_ID],
      )
    ).rows.map((u) => u.id);

    const serviceIds = Array.from(serviceMap.values());

    // collect clients ids for client_id usage
    const clientRows = await client.query(`SELECT id FROM clients WHERE company_id = $1`, [TRIVANCE_ID]);
    const clientIds = clientRows.rows.map((r) => r.id);
    let ci = 0;
    const totalToInsert = Math.min(12, serviceIds.length * Math.max(1, userIds.length));
    for (let i = 0; i < totalToInsert; i++) {
      const clientUserId = userIds[i % userIds.length];
      const serviceId = serviceIds[i % serviceIds.length];
      const { start_date } = getRandomDateRange();
      const status = statuses[i % statuses.length];
      const staffCreator = staffUsers.length > 0 && clientIds.length > 0 && i % 2 === 0;
      const creatorId = staffCreator ? staffUsers[i % staffUsers.length] : clientUserId;
      const maybeClientId = staffCreator ? clientIds[ci++ % clientIds.length] : null;

      if (maybeClientId) {
        await client.query(
          `INSERT INTO appointments (id, user_id, client_id, service_id, status, start_date, description) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [randomUUID(), creatorId, maybeClientId, serviceId, status, start_date, `Turno ${i + 1} creado por staff`],
        );
      } else {
        await client.query(
          `INSERT INTO appointments (id, user_id, service_id, status, start_date, description) VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), creatorId, serviceId, status, start_date, `Turno ${i + 1} auto-reservado`],
        );
      }
      console.log(`➕ Inserted appointment ${i + 1}`);
    }

    // Create a few standalone clients (no user linked)
    const standaloneClients = [
      { name: "Carla Gómez", email: `carla${Date.now()}@gmail.com`, phone: "1198765432", address: "Av. Córdoba 321, CABA" },
      { name: "Mario Díaz", email: `mario${Date.now()}@gmail.com`, phone: "1187654321", address: "Bv. San Juan 111, Córdoba" },
    ];
    for (const sc of standaloneClients) {
      try {
        await client.query(
          `INSERT INTO clients (company_id, name, email, phone, address) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (email, company_id) DO NOTHING`,
          [TRIVANCE_ID, sc.name, sc.email, sc.phone, sc.address],
        );
        console.log(`➕ Inserted standalone client: ${sc.email}`);
      } catch {}
    }

    await client.query("COMMIT");
    console.log("✅ Seeding complete");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during seeding:", err);
    await client.query("ROLLBACK");
    await client.end();
    process.exit(1);
  }
};

seedDb();
