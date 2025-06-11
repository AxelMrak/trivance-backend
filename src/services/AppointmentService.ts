import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { Appointment, AppointmentCreateDTO } from "@/entities/appointment";
import { OrderService } from "@/services/OrderService";
import { CreateOrderDto } from "@/entities/Order";
import { ServiceHandlerService } from "@services/ServiceHandlerService";
import { PaymentServiceFactory } from "@services/payments/PaymentServiceFactory";

const companyID = process.env.COMPANY_ID || "";

export class AppointmentService {
  constructor(
    private repository: AppointmentRepository,
    private serviceHandlerService: ServiceHandlerService,
    private orderService: OrderService,
  ) { }

  async getAll(): Promise<Appointment[]> {
    return this.repository.getCompanyAppointments(companyID);
  }

  async getById(id: string): Promise<Appointment | null> {
    const appointment = await this.repository.getAppointmentByIdWithJoins(companyID, id);
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    return appointment;
  }

  async updateAppointment(
    id: string,
    updatedData: Partial<Appointment>,
  ): Promise<Appointment | null> {
    return this.repository.update(id, updatedData);
  }

  async deleteAppointment(id: string): Promise<string | number | null> {
    const deletedAppointment = await this.repository.delete(id);
    if (!deletedAppointment) {
      throw new Error("Appointment not found");
    }
    return deletedAppointment;
  }

  async createAppointment(appointmentData: AppointmentCreateDTO): Promise<Appointment> {
    const serviceId = appointmentData.service_id;
    const service = await this.serviceHandlerService.getServiceById(serviceId);

    if (!service) {
      throw new Error("Service not found");
    }

    const appointmentRequiresDeposit = service.requires_deposit;

    const appointment: AppointmentCreateDTO = {
      service_id: serviceId,
      user_id: appointmentData.user_id,
      start_date: appointmentData.start_date,
      description: appointmentData.description || "",
    };

    if (appointmentRequiresDeposit) {
      appointment.status = "pending";
    } else {
      appointment.status = "confirmed";
    }

    const createdAppointment = await this.repository.create(appointment);

    if (!createdAppointment) {
      throw new Error("Failed to create appointment");
    }

    return createdAppointment;
  }

  async createPaymentLink(appointmentId: string): Promise<string> {
    const appointment = await this.getById(appointmentId);
    if (!appointment) {
      console.error("Appointment not found for ID:", appointmentId);
      console.log("APPOINTMENT Error:", appointment);
      throw new Error("Appointment not found");
    }
    const service = await this.serviceHandlerService.getServiceById(appointment.service_id);
    if (!service) {
      throw new Error("Service not found");
    }

    const formattedTitle = `Turno para ${service.name} - ${appointment.start_date}`;
    const provider = PaymentServiceFactory.getProvider("mercadopago");
    const paymentLink = await provider.createPaymentLink({
      id: appointment.id,
      title: formattedTitle,
      price: Number(service.price),
    });

    if (!paymentLink) {
      throw new Error("Failed to create payment link");
    }

    const order: CreateOrderDto = {
      appointment_id: appointment.id,
      status: "pending",
      provider: "mercadopago",
      reference_id: paymentLink,
    };

    const createdOrder = await this.orderService.createOrder(order);

    if (!createdOrder) {
      throw new Error("Failed to create order");
    }

    return paymentLink;
  }
}
