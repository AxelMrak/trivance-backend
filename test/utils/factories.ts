import bcrypt from "bcryptjs";
import { dbClient } from "@/config/db";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Service } from "@/entities/Service";
import { Appointment } from "@/entities/Appointment";

/**
 * This file contains factories for creating test data.
 * Using factories helps to ensure that test data is consistent and valid.
 * It also makes it easier to create data for different test scenarios.
 */

// A simple counter to ensure unique emails
let userCounter = 0;

/**
 * Creates a company in the database.
 * @param {Partial<Company>} overrides - Optional overrides for the company data.
 * @returns {Promise<Company>} The created company.
 */
export const createCompany = async (overrides: Partial<Company> = {}): Promise<Company> => {
  const companyData = {
    name: `Test Company ${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ...overrides,
  };

  const { rows } = await dbClient.query(
    "INSERT INTO companies (name) VALUES ($1) RETURNING *",
    [companyData.name]
  );

  return rows[0];
};

/**
 * Creates a user in the database.
 * @param {Partial<User>} overrides - Optional overrides for the user data.
 * @returns {Promise<User>} The created user.
 */
export const createUser = async (overrides: Partial<User> = {}): Promise<User> => {
  userCounter++;
  const password = "password123";
  const hashedPassword = bcrypt.hashSync(password, 10);

  const userData = {
    name: "Test User",
    email: `test${Date.now()}_${userCounter}@example.com`,
    password: hashedPassword,
    phone: "1234567890",
    address: "123 Test St",
    role: 5,
    ...overrides,
  };

  if (!userData.company_id) {
    const company = await createCompany();
    userData.company_id = company.id;
  }

  const { rows } = await dbClient.query(
    "INSERT INTO users (company_id, name, email, password, phone, address, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [
      userData.company_id,
      userData.name,
      userData.email,
      userData.password,
      userData.phone,
      userData.address,
      userData.role,
    ]
  );

  const user = rows[0];
  // try to attach role in pivot if table exists
  try {
    await dbClient.query(
      `INSERT INTO user_roles (user_id, role_level) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [user.id, user.role],
    );
  } catch {}
  // We attach the plain password to the user object so that we can use it in tests for logging in.
  (user as any).plainPassword = password;

  return user;
};

/**
 * Creates a service in the database.
 * @param {Partial<Service>} overrides - Optional overrides for the service data.
 * @returns {Promise<Service>} The created service.
 */
export const createService = async (overrides: Partial<Service> = {}): Promise<Service> => {
  const serviceData = {
    name: "Test Service",
    price: "100.00",
    requires_deposit: false,
    duration: "01:00:00", // 1 hour interval
    ...overrides,
  };

  if (!serviceData.company_id) {
    const company = await createCompany();
    serviceData.company_id = company.id;
  }

  const { rows } = await dbClient.query(
    "INSERT INTO services (company_id, name, price, requires_deposit, duration) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [
      serviceData.company_id,
      serviceData.name,
      serviceData.price,
      serviceData.requires_deposit,
      serviceData.duration,
    ]
  );

  return rows[0];
};

/**
 * Creates an appointment in the database.
 * @param {Partial<Appointment>} overrides - Optional overrides for the appointment data.
 * @returns {Promise<Appointment>} The created appointment.
 */
export const createAppointment = async (overrides: Partial<Appointment> = {}): Promise<Appointment> => {
  const appointmentData = {
    start_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    status: "pending",
    ...overrides,
  };

  if (!appointmentData.user_id) {
    const user = await createUser();
    appointmentData.user_id = user.id;
  }

  if (!appointmentData.service_id) {
    const service = await createService();
    appointmentData.service_id = service.id;
  }

  const { rows } = await dbClient.query(
    "INSERT INTO appointments (user_id, service_id, start_date, status) VALUES ($1, $2, $3, $4) RETURNING *",
    [
      appointmentData.user_id,
      appointmentData.service_id,
      appointmentData.start_date,
      appointmentData.status,
    ]
  );

  return rows[0];
};
