import { Appointment } from "@/entities/Appointment";
import { Service } from "@/entities/Service";
import { User } from "@/entities/User";
import { createService, createAppointment, createUser } from "@test/factories";
import { getTestAgent } from "@test/setup";

const { randomUUID } = require("crypto");

// jest.mock("@services/payments/PaymentServiceFactory");

/**
 * This file contains integration tests for the AppointmentRoutes.
 * It tests the endpoint for creating a payment link for an appointment using real MercadoPago service.
 */
describe("POST /api/appointments/payment/:id/link - Integration Tests", () => {
  let user: User;
  let service: Service;
  let appointment: Appointment;
  let token: string;

  /**
   * Before each test, we create a new user, service, and appointment.
   * We also log in the user to get an authentication token.
   */
  beforeEach(async () => {
    user = await createUser({ email: `axel+${randomUUID()}@test.com` });
    service = await createService({
      company_id: user.company_id,
      requires_deposit: true,
      name: "Test Service",
      price: "1000",
    });
    appointment = await createAppointment({
      user_id: user.id,
      service_id: service.id,
    });

    const res = await getTestAgent()
      .post("/api/auth/sign-in")
      .send({
        email: user.email,
        password: (user as any).plainPassword,
      });
    const setCookie = res.headers["set-cookie"]?.[0] || "";
    token = /token=([^;]+)/.exec(setCookie)?.[1] || "";
  });

  /**
   * Test case for creating a real payment link for an appointment.
   * It checks if the endpoint returns a 201 status code and a valid MercadoPago payment link.
   */
  it("creates a real payment link for an appointment", async () => {
    const res = await getTestAgent()
      .post(`/api/appointments/payment/${appointment.id}/link`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);

    expect(res.body).toHaveProperty("orderId");
    expect(res.body).toHaveProperty("paymentLink");
    expect(res.body).toHaveProperty("paymentDetails");
    expect(res.body.paymentLink).toMatch(
      /^https:\/\/(www\.)?mercadopago\.com\.ar\/checkout\/v1\/redirect/,
    );
  });

  /**
   * Test case for verifying payment link structure and metadata.
   * It checks if the created payment contains correct appointment and service information.
   */
  it("creates payment link with correct service information", async () => {
    const res = await getTestAgent()
      .post(`/api/appointments/payment/${appointment.id}/link`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);

    if (res.body.paymentDetails) {
      expect(res.body.paymentDetails.items).toHaveLength(1);
      const item = res.body.paymentDetails.items[0];
      expect(item.title).toContain(service.name);
      expect(item.unit_price).toBe(Number(service.price));
      expect(item.quantity).toBe(1);
      expect(item.currency_id).toBe("ARS");
    }
  });

  /**
   * Test case for returning a 404 error if the appointment is not found.
   * It checks if the endpoint returns a 404 status code when the appointment does not exist.
   */
  it("returns 404 if appointment not found", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000000000";

    const res = await getTestAgent()
      .post(`/api/appointments/payment/${nonExistentId}/link`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toContain("Turno no encontrado");
  });

  /**
   * Test case for unauthorized access.
   * It checks if the endpoint returns a 401 status code when no token is provided.
   */
  it("returns 401 when no authentication token is provided", async () => {
    const res = await getTestAgent().post(`/api/appointments/payment/${appointment.id}/link`);

    expect(res.status).toBe(401);
  });

  /**
   * Test case for forbidden access.
   * It checks if the endpoint returns a 403 status code when user tries to access another user's appointment.
   */
  it("returns 403 when user tries to access another user's appointment", async () => {
    const otherUser = await createUser({ email: `other+${randomUUID()}@test.com` });
    const otherAppointment = await createAppointment({
      user_id: otherUser.id,
      service_id: service.id,
    });

    const res = await getTestAgent()
      .post(`/api/appointments/payment/${otherAppointment.id}/link`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });
});
