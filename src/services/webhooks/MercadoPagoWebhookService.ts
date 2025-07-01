import { OrderService } from "@/services/OrderService";
import { AppointmentService } from "@/services/AppointmentService";

export class MercadoPagoWebhookService {
  constructor(
    private orderService: OrderService,
    private appointmentService: AppointmentService,
  ) {}

  async processWebhook(body: any): Promise<any> {
    const paymentStatus = body?.data?.status;
    const externalReference = body?.data?.external_reference || body?.data?.id;
    console.log("Processing Mercado Pago webhook:", body);
    if (!paymentStatus || !externalReference) {
      throw new Error("Missing data in webhook body");
    }

    const order = await this.orderService.getOrderByReference(externalReference);
    console.log("Order found:", order);
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
    console.log("Updating appointment status to:", appointmentStatus);
    const response = await this.appointmentService.updateAppointment(order.appointment_id, {
      status: appointmentStatus,
    });
    console.log("Appointment updated successfully:", response);
    return {
      orderId: order.id,
      appointmentId: order.appointment_id,
      status: updatedStatus,
    };
  }
}
