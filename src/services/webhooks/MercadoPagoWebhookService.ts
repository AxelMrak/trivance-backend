import { OrderService } from "@/services/OrderService";
import { AppointmentService } from "@/services/AppointmentService";
import { getPaymentResource } from "@/services/payments/mercadopagoClient";

export class MercadoPagoWebhookService {
  constructor(
    private orderService: OrderService,
    private appointmentService: AppointmentService,
  ) {}

  async processWebhook(body: any): Promise<any> {
    // Mercado Pago webhooks often only include { type: 'payment', data: { id } }.
    // If status is missing, fetch the payment details to get status and reference.
    let paymentStatus: string | undefined = body?.data?.status;
    let reference: string | undefined = body?.data?.external_reference || body?.data?.preference_id;
    console.log("Processing Mercado Pago webhook with body:", body);
    if ((!paymentStatus || !reference) && body?.type === "payment" && body?.data?.id) {
      try {
        const paymentResource = getPaymentResource();
        const paymentData: any = await paymentResource.get({ id: body.data.id });
        paymentStatus = paymentStatus || paymentData?.status;
        reference = reference || paymentData?.external_reference || paymentData?.preference_id;
      } catch (err) {
        console.error("Error fetching payment details from Mercado Pago:", err);
        throw new Error("No se pudo obtener el estado del pago desde Mercado Pago");
      }
    }

    if (!reference && body?.data?.id) {
      reference = body.data.id;
    }

    if (!paymentStatus || !reference) {
      throw new Error("Faltan datos en el cuerpo del webhook");
    }

    let order = null as any;
    try {
      order = await this.orderService.getOrderByReference(reference);
    } catch (e) {
      // Align with existing OrderService.getOrderByReference behavior which throws when not found
      console.warn("Pedido no encontrado como referencia:", reference);
      return;
    }
    if (!order) {
      console.warn("Pedido no encontrado como referencia:", reference);
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

    return {
      orderId: order.id,
      appointmentId: order.appointment_id,
      status: updatedStatus,
    };
  }
}
