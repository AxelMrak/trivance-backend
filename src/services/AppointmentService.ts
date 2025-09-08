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
import { UserRepository } from "@/repositories/UserRepository";

export class AppointmentService {
  constructor(
    private repository: AppointmentRepository,
    private serviceHandlerService: ServiceHandlerService,
    private orderService: OrderService,
    private userRepository: UserRepository,
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
    const dataToUpdate: Partial<Appointment> = { ...updatedData };
    const maybeStart: unknown = (updatedData as any).start_date;
    if (typeof maybeStart === "string") {
      const parsed = new Date(maybeStart);
      if (isNaN(parsed.getTime())) {
        throw new BadRequestError("Fecha de turno inválida");
      }
      (dataToUpdate as any).start_date = parsed;
    }

    return this.repository.update(id, dataToUpdate);
  }

  async deleteAppointment(id: string): Promise<string | number | null> {
    const deletedAppointment = await this.repository.delete(id);
    if (!deletedAppointment) {
      throw new Error("Appointment not found");
    }
    return deletedAppointment;
  }

  async createAppointment(
    appointmentData: AppointmentCreateDTO,
    userId: string,
  ): Promise<Appointment> {
    const serviceId = appointmentData.service_id as unknown as string;
    if (!serviceId || typeof serviceId !== "string" || serviceId.trim() === "") {
      throw new BadRequestError("Servicio inválido");
    }

    let service: any = null;
    try {
      service = await this.serviceHandlerService.getServiceById(serviceId);
    } catch (_e) {
      throw new BadRequestError("Servicio inválido");
    }
    if (!service) {
      throw new BadRequestError("Servicio inválido");
    }

    const appointmentRequiresDeposit = service.requires_deposit;
    const startDate = new Date(appointmentData.start_date);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestError("Fecha de turno inválida");
    }
    // Ensure the user exists to avoid FK errors (cheap existence check)
    const userExists = await this.userRepository.existsById(userId);
    if (!userExists) {
      throw new BadRequestError("Usuario inválido");
    }

    const appointmentToCreate: Partial<Appointment> = {
      service_id: serviceId,
      user_id: userId,
      start_date: startDate,
      description: appointmentData.description || "",
      status: appointmentRequiresDeposit ? "pending" : "confirmed",
    };

    const createdAppointment = await this.repository.create(appointmentToCreate);
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
