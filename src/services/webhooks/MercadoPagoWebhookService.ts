import { OrderService } from "@/services/OrderService";
import { AppointmentService } from "@/services/AppointmentService";

export class MercadoPagoWebhookService {
  constructor(
    private orderService: OrderService,
    private appointmentService: AppointmentService,
  ) {}

  async processWebhook(body: any): Promise<void> {
    const paymentStatus = body?.data?.status;
    const externalReference = body?.data?.external_reference;

    if (!paymentStatus || !externalReference) {
      throw new Error("Missing data in webhook body");
    }

    const order = await this.orderService.getOrderByReference(externalReference);
    if (!order) {
      console.warn("Order not found for reference:", externalReference);
      return;
    }

    const updatedStatus =
      paymentStatus === "approved"
        ? "paid"
        : paymentStatus === "rejected"
          ? "cancelled"
          : "pending";

    await this.orderService.updateOrder(order.id, { status: updatedStatus });

    const appointmentStatus =
      updatedStatus === "paid"
        ? "confirmed"
        : updatedStatus === "cancelled"
          ? "cancelled"
          : "pending";

    await this.appointmentService.updateAppointment(order.appointment_id, {
      status: appointmentStatus,
    });
  }
}
