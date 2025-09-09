// Setup & imports
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { randomUUID } = require("crypto");

dotenv.config();

// DB connection
const client = new Client({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres:postgres@trivance-db:5432/trivance_db",
});

// App constants
const TRIVANCE_NAME = "Trivance";
const TRIVANCE_ID = "6f299074-dc4c-47b7-9aed-4683fb29d97e";
const OTHER_COMPANIES = [{ name: "NovaTech Solutions" }, { name: "BlueHorizon Ltd" }];

const ROLE = {
  GUEST: 0,
  CLIENT: 1,
  STAFF: 2,
  MANAGER: 3,
  ADMIN: 4,
  SUPER_USER: 5,
};

// Small helpers
const argPhone = () => `11${Math.floor(10000000 + Math.random() * 89999999)}`;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const formatIso = (d) => d.toISOString();

// Sample data
const addressList = [
  "Av. San Martín 742, Mendoza",
  "Av. Belgrano 1234, CABA",
  "Bv. San Juan 111, Córdoba",
  "Av. Colón 2150, Mar del Plata",
  "Brown 980, Rosario",
];

const superAdminsFixed = [
  { name: "Axel", email: "axel@test.com" },
  { name: "Julian", email: "julian@test.com" },
  { name: "Nacho", email: "nacho@test.com" },
  { name: "Nahuel", email: "nahuel@test.com" },
];

const roleSampleUsers = [
  { role: ROLE.CLIENT, name: "María González", email: "maria.gonzalez@test.com" },
  { role: ROLE.STAFF, name: "Laura Rodríguez", email: "laura.rodriguez@test.com" },
  { role: ROLE.MANAGER, name: "Santiago López", email: "santiago.lopez@test.com" },
  { role: ROLE.ADMIN, name: "Camila Fernández", email: "camila.fernandez@test.com" },
];

const serviceCatalog = [
  {
    name: "Limpieza Facial Profunda",
    description:
      "Higiene profesional con extracción, vapor ozono y máscara calmante. Recomendado para piel mixta a grasa.",
    duration: "01:00:00",
    price: 18000,
  },
  {
    name: "Masaje Descontracturante",
    description: "Técnica focalizada para aliviar tensiones en cervicales, espalda y hombros.",
    duration: "01:00:00",
    price: 22000,
  },
  {
    name: "Depilación Láser (Zonas Pequeñas)",
    description:
      "Tecnología láser diodo con enfriamiento. Sesión rápida para bozo, mentón o axilas.",
    duration: "00:30:00",
    price: 25000,
  },
  {
    name: "Tratamiento Anticelulitis",
    description: "Radiofrecuencia + drenaje para mejorar textura y tono de la piel.",
    duration: "01:30:00",
    price: 38000,
  },
  {
    name: "Microdermoabrasión con Punta de Diamante",
    description: "Exfoliación controlada para renovar la capa superficial y suavizar poros.",
    duration: "00:45:00",
    price: 20000,
  },
  {
    name: "Radiofrecuencia Facial",
    description: "Estimulación de colágeno para firmeza y contorno.",
    duration: "01:00:00",
    price: 26000,
  },
  {
    name: "Manicura & Pedicura Spa",
    description: "Servicio completo con limado, cutícula, hidratación y esmaltado.",
    duration: "02:00:00",
    price: 18000,
  },
  {
    name: "Spa de Pies",
    description: "Exfoliación profunda, hidratación intensa y masaje.",
    duration: "01:00:00",
    price: 14000,
  },
  {
    name: "Extensiones de Pestañas Volume 3D",
    description: "Efecto volumen con diseño personalizado.",
    duration: "01:30:00",
    price: 32000,
  },
  {
    name: "Perfilado y Diseño de Cejas",
    description: "Medición de visagismo, depilación y styling. Opcional tintura.",
    duration: "00:30:00",
    price: 10000,
  },
  {
    name: "Corte de Cabello Unisex",
    description: "Lavado y corte a tijera o máquina.",
    duration: "00:45:00",
    price: 12000,
  },
  {
    name: "Coloración Completa",
    description: "Color global o retoque de raíces. Incluye brushing.",
    duration: "02:00:00",
    price: 42000,
  },
  {
    name: "Lifting de Pestañas",
    description: "Curvatura natural y tinte suave.",
    duration: "00:50:00",
    price: 18000,
  },
];

const appointmentNotes = [
  "Primera visita, evaluación rápida previa.",
  "Foco en cervicales y hombros.",
  "Recomendación: hidratación diaria.",
  "Confirmado por WhatsApp.",
  "Piel sensible: intensidad ajustada.",
  "Sugerir limpieza facial el próximo mes.",
  "Reprogramado por clima.",
  "Muy buen resultado; repetir en 3 semanas.",
  "Alergia a perfumes: registrar.",
  "Pago en local, factura A.",
];

const statuses = ["pending", "confirmed", "cancelled"];

// Date generator for appointments
const randomFutureStart = () => {
  const days = 2 + Math.floor(Math.random() * 13);
  const base = new Date();
  base.setDate(base.getDate() + days);
  const hour = 9 + Math.floor(Math.random() * 9);
  const minute = [0, 30][Math.floor(Math.random() * 2)];
  base.setHours(hour, minute, 0, 0);
  return base;
};

// Ensure companies
async function ensureCompanies() {
  const { rows } = await client.query(`SELECT id FROM companies WHERE id = $1`, [TRIVANCE_ID]);
  if (!rows.length) {
    await client.query(`INSERT INTO companies (id, name) VALUES ($1, $2)`, [
      TRIVANCE_ID,
      TRIVANCE_NAME,
    ]);
    console.log(`➕ Created company "${TRIVANCE_NAME}"`);
  } else {
    console.log(`ℹ️ Company "${TRIVANCE_NAME}" already exists`);
  }

  for (const c of OTHER_COMPANIES) {
    const r = await client.query(`SELECT id FROM companies WHERE name = $1`, [c.name]);
    if (!r.rows.length) {
      await client.query(`INSERT INTO companies (id, name) VALUES ($1, $2)`, [
        randomUUID(),
        c.name,
      ]);
      console.log(`➕ Created company "${c.name}"`);
    } else {
      console.log(`↩️ Company "${c.name}" already exists`);
    }
  }
}

// Ensure roles
async function ensureRoles() {
  await client.query(
    `INSERT INTO roles (level, name) VALUES
      (0,'GUEST'),(1,'CLIENT'),(2,'STAFF'),(3,'MANAGER'),(4,'ADMIN'),(5,'SUPER_USER')
     ON CONFLICT (level) DO NOTHING`,
  );
}

// User builders
function buildUserRow({ name, email, role }) {
  return {
    id: randomUUID(),
    name,
    email,
    role,
    passwordHash: bcrypt.hashSync("password", 10),
    phone: argPhone(),
    address: pick(addressList),
  };
}

async function upsertUser(u, { createClientOn = ROLE.CLIENT } = {}) {
  const exists = await client.query(`SELECT id FROM users WHERE email = $1 AND company_id = $2`, [
    u.email,
    TRIVANCE_ID,
  ]);
  if (exists.rows.length) {
    console.log(`↩️ Skipping existing user: ${u.email}`);
    return exists.rows[0].id;
  }

  await client.query(
    `INSERT INTO users (id, company_id, name, email, password, phone, address)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [u.id, TRIVANCE_ID, u.name, u.email, u.passwordHash, u.phone, u.address],
  );

  await client.query(
    `INSERT INTO user_roles (user_id, role_level)
     VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING`,
    [u.id, u.role],
  );

  if (u.role === createClientOn) {
    await client.query(
      `INSERT INTO clients (user_id, company_id, name, email, phone, address)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO NOTHING`,
      [u.id, TRIVANCE_ID, u.name, u.email, u.phone, u.address],
    );
  }

  console.log(`➕ Inserted user: ${u.email} [role=${u.role}]`);
  return u.id;
}

// Seed users
async function seedUsers() {
  for (const sa of superAdminsFixed) {
    const row = buildUserRow({ name: sa.name, email: sa.email, role: ROLE.SUPER_USER });
    await upsertUser(row, { createClientOn: ROLE.CLIENT });
  }

  for (const ru of roleSampleUsers) {
    const row = buildUserRow(ru);
    await upsertUser(row, { createClientOn: ROLE.CLIENT });
  }

  const extraStaff = [
    { name: "Tamara Pérez", email: "tamara.perez@test.com" },
    { name: "Diego Gómez", email: "diego.gomez@test.com" },
  ];
  for (const e of extraStaff) {
    await upsertUser(buildUserRow({ name: e.name, email: e.email, role: ROLE.STAFF }), {
      createClientOn: ROLE.CLIENT,
    });
  }
}

// Seed services
async function seedServices() {
  const { rows } = await client.query(`SELECT id,name FROM services WHERE company_id = $1`, [
    TRIVANCE_ID,
  ]);
  const existing = new Set(rows.map((r) => r.name));

  for (const s of serviceCatalog) {
    if (existing.has(s.name)) {
      console.log(`↩️ Skipping existing service: ${s.name}`);
      continue;
    }
    const id = randomUUID();
    await client.query(
      `INSERT INTO services (id, company_id, name, description, duration, price)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, TRIVANCE_ID, s.name, s.description, s.duration, s.price],
    );
    console.log(`➕ Inserted service: ${s.name}`);
  }

  const { rows: all } = await client.query(`SELECT id FROM services WHERE company_id = $1`, [
    TRIVANCE_ID,
  ]);
  return all.map((r) => r.id);
}

// Ensure standalone clients
async function ensureStandaloneClients() {
  const list = [
    {
      name: "Carla Gómez",
      email: "carla.indep@test.com",
      phone: argPhone(),
      address: pick(addressList),
    },
    {
      name: "Mario Díaz",
      email: "mario.indep@test.com",
      phone: argPhone(),
      address: pick(addressList),
    },
  ];

  for (const c of list) {
    await client.query(
      `INSERT INTO clients (company_id, name, email, phone, address)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email, company_id) DO NOTHING`,
      [TRIVANCE_ID, c.name, c.email, c.phone, c.address],
    );
    console.log(`➕ Ensured standalone client: ${c.email}`);
  }
}

// Seed appointments
async function seedAppointments({ perService = 2 } = {}) {
  // collect clients
  const { rows: clientRows } = await client.query(`SELECT id FROM clients WHERE company_id = $1`, [
    TRIVANCE_ID,
  ]);
  const clientIds = clientRows.map((r) => r.id);
  if (!clientIds.length) return;

  // collect staff creators
  const { rows: staffRows } = await client.query(
    `SELECT u.id
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.company_id = $1 AND ur.role_level = $2`,
    [TRIVANCE_ID, ROLE.STAFF],
  );
  const staffIds = staffRows.map((r) => r.id);

  // collect client users
  const { rows: clientUserRows } = await client.query(
    `SELECT u.id
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.company_id = $1 AND ur.role_level = $2`,
    [TRIVANCE_ID, ROLE.CLIENT],
  );
  const clientUserIds = clientUserRows.map((r) => r.id);

  // collect services
  const { rows: serviceRows } = await client.query(
    `SELECT id FROM services WHERE company_id = $1`,
    [TRIVANCE_ID],
  );
  const serviceIds = serviceRows.map((r) => r.id);
  if (!serviceIds.length) return;

  let created = 0;

  for (const sId of serviceIds) {
    for (let i = 0; i < perService; i++) {
      const start = randomFutureStart();
      const status = pick(statuses);
      const note = pick(appointmentNotes);
      const asStaff = staffIds.length && i % 2 === 0;

      const id = randomUUID();
      const descStaff = `Reserva creada por staff. ${note}`;
      const descClient = `Auto-reservado por el cliente. ${note}`;

      if (asStaff) {
        const creatorId = pick(staffIds);
        const clientId = pick(clientIds);

        // 7 params: id, user_id, client_id, service_id, status, start_date, description
        await client.query(
          `INSERT INTO appointments
            (id, user_id, client_id, service_id, status, start_date, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, creatorId, clientId, sId, status, formatIso(start), descStaff],
        );
      } else {
        const creatorId = pick(clientUserIds.length ? clientUserIds : staffIds);

        // 6 params: id, user_id, service_id, status, start_date, description
        await client.query(
          `INSERT INTO appointments
            (id, user_id, service_id, status, start_date, description)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, creatorId, sId, status, formatIso(start), descClient],
        );
      }

      created++;
      console.log(`➕ Inserted appointment #${created}`);
    }
  }
}

// Orchestrator
(async function seedDb() {
  try {
    await client.connect();
    console.log("✅ Connected to the database");
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query("BEGIN");

    await ensureCompanies();
    await ensureRoles();
    await seedUsers();
    const serviceIds = await seedServices();
    await ensureStandaloneClients();
    if (serviceIds.length) await seedAppointments({ perService: 2 });

    await client.query("COMMIT");
    console.log("✅ Seeding complete");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during seeding:", err);
    try {
      await client.query("ROLLBACK");
    } catch {}
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch {}
  }
})();
