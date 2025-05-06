const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config();

const client = new Client({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres:postgres@trivance-db:5432/trivance_db",
});

const COMPANY_NAME = "Trivance";
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
    role: "SUPER_USER",
    phone: "1234567890",
    address: "123 San Martin, Mendoza, Argentina",
  };
});

const seedDb = async () => {
  try {
    await client.connect();
    console.log("✅ Connected to the database");

    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await client.query("BEGIN");

    const { rows: companyRows } = await client.query(`SELECT id FROM companies WHERE name = $1`, [
      COMPANY_NAME,
    ]);

    let companyId;
    if (companyRows.length) {
      companyId = companyRows[0].id;
      console.log(`ℹ️  Company "${COMPANY_NAME}" already exists (id=${companyId})`);
    } else {
      const { rows } = await client.query(
        `INSERT INTO companies (name)
         VALUES ($1)
         RETURNING id`,
        [COMPANY_NAME],
      );
      companyId = rows[0].id;
      console.log(`➕ Created company "${COMPANY_NAME}" (id=${companyId})`);
    }

    const { rows: existingUserRows } = await client.query(
      `SELECT email FROM users WHERE email = ANY($1)`,
      [initialUsers],
    );
    const existingEmails = new Set(existingUserRows.map((r) => r.email));

    for (const user of users) {
      if (existingEmails.has(user.email)) {
        console.log(`↩️  Skipping existing user: ${user.email}`);
        continue;
      }
      const hashed = bcrypt.hashSync(user.password, 10);
      await client.query(
        `INSERT INTO users (
          id, company_id, name, email, password, role, phone, address
         ) VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7  )`,
        [companyId, user.name, user.email, hashed, user.role, user.phone, user.address],
      );
      console.log(`➕ Inserted user: ${user.email}`);
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
