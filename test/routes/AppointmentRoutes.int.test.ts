import { getTestAgent } from "../setup";
import { createAppointment, createService, createUser } from "../factories";
import { Appointment } from "@/entities/Appointment";
import { Service } from "@/entities/Service";
import { User } from "@/entities/User";
import { PaymentServiceFactory } from "@services/payments/PaymentServiceFactory";

// Mock the PaymentServiceFactory to avoid making real payments in tests.
jest.mock("@services/payments/PaymentServiceFactory");

/**
 * This file contains integration tests for the AppointmentRoutes.
 * It tests the endpoint for creating a payment link for an appointment.
 */
describe("POST /appointments/payment/:id/link", () => {
  let user: User;
  let service: Service;
  let appointment: Appointment;
  let token: string;

  /**
   * Before each test, we create a new user, service, and appointment.
   * We also log in the user to get an authentication token.
   */
  beforeEach(async () => {
    user = await createUser();
    service = await createService({ company_id: user.company_id, requires_deposit: true });
    appointment = await createAppointment({ user_id: user.id, service_id: service.id });

    const res = await getTestAgent().post("/auth/login").send({
      email: "axel@test.com",
      password: "password",
    });
    token = res?.body?.session?.token;
  });

  /**
   * Test case for creating a payment link for an appointment.
   * It checks if the endpoint returns a 201 status code and a payment link.
   */
  it("creates a payment link for an appointment", async () => {
    const mockPaymentResponse = { id: "mock-payment-id", init_point: "https://mock.payment.link" };

    // Mock the getProvider method of the PaymentServiceFactory to return a mock payment service.
    (PaymentServiceFactory.getProvider as jest.Mock).mockReturnValue({
      createPaymentLink: jest.fn().mockResolvedValue(mockPaymentResponse),
    });

    const res = await getTestAgent()
      .post(`/appointments/payment/${appointment.id}/link`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("paymentLink", mockPaymentResponse.init_point);
  });

  /**
   * Test case for returning a 404 error if the appointment is not found.
   * It checks if the endpoint returns a 404 status code when the appointment does not exist.
   */
  it("returns 404 if appointment not found", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000000000";
    const res = await getTestAgent()
      .post(`/appointments/payment/${nonExistentId}/link`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
