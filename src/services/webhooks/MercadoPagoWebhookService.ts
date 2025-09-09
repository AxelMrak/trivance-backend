import { OrderService } from "@/services/OrderService";
import { AppointmentService } from "@/services/AppointmentService";
import { getPaymentResource } from "@/services/payments/mercadopagoClient";

export class MercadoPagoWebhookService {
  constructor(
    private orderService: OrderService,
    private appointmentService: AppointmentService,
  ) {}

  async processWebhook(body: any): Promise<any> {
    if (body?.type !== "payment" || !body?.data?.id) {
      console.warn("Webhook is not a processable payment notification:", body);
      return { message: "Webhook not processed: not a payment notification." };
    }

    let paymentData: any;

    // If live_mode is false, it's a test webhook. We should not call the API.
    if (body.live_mode === false) {
      console.log("Processing test webhook. Simulating payment data for ID:", body.data.id);
      // For test webhooks, we simulate the payment data.
      // We assume the payment is approved and the external_reference is the payment ID itself.
      paymentData = {
        status: "approved",
        external_reference: body.data.id,
      };
    } else {
      console.log("Processing live Mercado Pago webhook for payment ID:", body.data.id);
      try {
        const paymentResource = getPaymentResource();
        paymentData = await paymentResource.get({ id: body.data.id });
      } catch (err) {
        console.error(`Error fetching payment with id ${body.data.id} from Mercado Pago:`, err);
        throw new Error("Could not fetch payment details from Mercado Pago.");
      }
    }

    const paymentStatus = paymentData?.status;
    const reference = paymentData?.external_reference;
    console.log("Using payment data:", paymentData);
    console.log(`Payment status: ${paymentStatus}, Reference: ${reference}`);

    if (!paymentStatus || !reference) {
      console.error("Payment data is missing status or reference:", paymentData);
      throw new Error("Incomplete payment data.");
    }

    let order = null as any;
    try {
      order = await this.orderService.getOrderByReference(reference);
    } catch (e) {
      console.error(`Error fetching order with reference ${reference}:`, e);
      return; // Stop processing if order lookup fails
    }
    if (!order) {
      console.warn(`Order not found for reference: ${reference}`);
      return; // Stop processing if order not found
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
