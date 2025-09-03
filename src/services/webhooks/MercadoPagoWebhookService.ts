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
    if (!paymentStatus || !externalReference) {
      throw new Error("Faltan datos en el cuerpo del webhook");
    }

    const order = await this.orderService.getOrderByReference(externalReference);
    if (!order) {
      console.warn("Pedido no encontrado como referencia:", externalReference);
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
    const response = await this.appointmentService.updateAppointment(order.appointment_id, {
      status: appointmentStatus,
    });
    return {
      orderId: order.id,
      appointmentId: order.appointment_id,
      status: updatedStatus,
    };
  }
}
