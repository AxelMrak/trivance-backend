const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { randomUUID } = require("crypto");

dotenv.config();

const client = new Client({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres:postgres@trivance-db:5432/trivance_db",
});

const TRIVANCE_NAME = "Trivance";
const TRIVANCE_ID = "6f299074-dc4c-47b7-9aed-4683fb29d97e";

const OTHER_COMPANIES = [{ name: "NovaTech Solutions" }, { name: "BlueHorizon Ltd" }];

const initialUsers = [
  "julian99skate@gmail.com",
  "nacho301011@gmail.com",
  "agustin2015.castillo@gmail.com",
  "nahuposebon@gmail.com",
  "lautaro.ajrz@gmail.com",
  "axel@test.com",
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

const rolesToSeed = [0, 1, 2, 3, 4];
for (const role of rolesToSeed) {
  users.push({
    name: `user_role_${role}`,
    email: `role${role}_${Math.random().toString(36).substring(2, 8)}@test.com`,
    password: "password",
    role,
    phone: "9876543210",
    address: "456 Belgrano, Córdoba, Argentina",
  });
}

const services = [
  {
    name: "Consultoría Estratégica",
    description: "Análisis y planificación de negocios personalizados.",
    duration: "1 hour",
    price: 150.0,
  },
  {
    name: "Desarrollo Web",
    description: "Sitios web modernos y escalables.",
    duration: "2 hours",
    price: 300.0,
  },
  {
    name: "Mantenimiento Técnico",
    description: "Soporte técnico mensual.",
    duration: "1 hour",
    price: 100.0,
  },
  {
    name: "Automatización de Procesos",
    description: "Scripts y bots para mejorar productividad.",
    duration: "3 hours",
    price: 450.0,
  },
  {
    name: "Diseño UI/UX",
    description: "Diseño centrado en el usuario para apps y sitios.",
    duration: "1.5 hours",
    price: 200.0,
  },
  {
    name: "Capacitación en Tecnología",
    description: "Cursos personalizados para equipos.",
    duration: "2.5 hours",
    price: 250.0,
  },
  {
    name: "Auditoría de Código",
    description: "Revisión detallada de buenas prácticas y seguridad.",
    duration: "2 hours",
    price: 350.0,
  },
  {
    name: "Integraciones con APIs",
    description: "Conexión con servicios externos (Stripe, Mailchimp, etc).",
    duration: "1.5 hours",
    price: 275.0,
  },
  {
    name: "Optimización de Rendimiento",
    description: "Mejora de velocidad y eficiencia en aplicaciones.",
    duration: "1 hour",
    price: 180.0,
  },
  {
    name: "Soporte Premium",
    description: "Atención prioritaria y resolución ágil.",
    duration: "0.5 hour",
    price: 90.0,
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
          id, company_id, name, email, password, role, phone, address
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )`,
        [id, TRIVANCE_ID, user.name, user.email, hashed, user.role, user.phone, user.address],
      );
      insertedUserIds.push(id);
      console.log(`➕ Inserted user: ${user.email}`);
    }

    const { rows: serviceRows } = await client.query(
      `SELECT id, name FROM services WHERE company_id = $1`,
      [TRIVANCE_ID],
    );
    const serviceMap = new Map(serviceRows.map((s) => [s.name, s.id]));

    for (const service of services) {
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

    // Insert appointments
    const userIds = insertedUserIds.length
      ? insertedUserIds
      : (await client.query(`SELECT id FROM users WHERE company_id = $1`, [TRIVANCE_ID])).rows.map(
          (u) => u.id,
        );

    const serviceIds = Array.from(serviceMap.values());

    for (let i = 0; i < 10; i++) {
      const userId = userIds[i % userIds.length];
      const serviceId = serviceIds[i % serviceIds.length];
      const { start_date } = getRandomDateRange();
      const status = statuses[i % statuses.length];

      await client.query(
        `INSERT INTO appointments (
          id, user_id, service_id, status, start_date, description
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )`,
        [
          randomUUID(),
          userId,
          serviceId,
          status,
          start_date,
          `Descripción automática ${i + 1}`,
        ],
      );
      console.log(`➕ Inserted appointment ${i + 1}`);
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
