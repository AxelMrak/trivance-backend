import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { Appointment, AppointmentCreateDTO } from "@/entities/Appointment";
import { OrderService } from "@/services/OrderService";
import { CreateOrderDto } from "@/entities/Order";
import { ServiceHandlerService } from "@services/ServiceHandlerService";
import { PaymentServiceFactory } from "@services/payments/PaymentServiceFactory";
import { formatDate } from "@/utils/format";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/errors/httpErrors";
import { CreatePaymentLinkResponse } from "@/entities/Response";

export class AppointmentService {
  constructor(
    private repository: AppointmentRepository,
    private serviceHandlerService: ServiceHandlerService,
    private orderService: OrderService,
  ) {}

  async getAll(): Promise<Appointment[]> {
    return this.repository.getCompanyAppointments();
  }

  async getById(id: string): Promise<Appointment | null> {
    let appointment;
    try {
      appointment = await this.repository.getAppointmentByIdWithJoins(id);
    } catch (error: any) {
      throw new InternalServerError("Error en la base de datos al buscar el turno");
    }

    if (!appointment) {
      throw new NotFoundError("Turno no encontrado");
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

    const newAppointment = await this.getById(createdAppointment.id);

    if (!newAppointment) {
      throw new Error("Failed to fetch new appointment");
    }

    return newAppointment;
  }

  async createPaymentLink(
    appointmentId: string,
    userId: string,
  ): Promise<CreatePaymentLinkResponse> {
    if (!appointmentId) {
      throw new BadRequestError("Falta el ID del turno");
    }

    const appointment = await this.getById(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Turno no encontrado");
    }

    if (appointment.user_id !== userId) {
      throw new ForbiddenError("No tienes permiso para acceder a este turno");
    }

    const service = await this.serviceHandlerService.getServiceById(appointment.service_id);
    if (!service) {
      throw new NotFoundError("Servicio no encontrado");
    }

    const formattedTitle = `Turno para ${service.name} - ${formatDate(appointment.start_date)}`;
    const provider = PaymentServiceFactory.getProvider("mercadopago");

    const paymentResponse = (await provider.createPaymentLink({
      id: appointment.id,
      title: formattedTitle,
      price: Number(service.price),
    })) as any;

    if (!paymentResponse) {
      throw new InternalServerError("Fallo al crear link de pago");
    }

    const order: CreateOrderDto = {
      appointment_id: appointment.id,
      status: "pending",
      provider: "mercadopago",
      reference_id: paymentResponse.id,
    };

    const createdOrder = await this.orderService.createOrder(order);
    if (!createdOrder) {
      throw new InternalServerError("Fallo al crear el pedido asociado al turno");
    }

    const response = {
      orderId: createdOrder.id,
      paymentLink: paymentResponse.init_point,
      paymentDetails: paymentResponse,
    };

    return response;
  }
}
