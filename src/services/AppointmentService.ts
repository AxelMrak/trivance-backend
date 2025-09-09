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
import { JwtPayload } from "@/middlewares/authmiddleware";
import {
  canEditAppointmentDate,
  canEditAppointmentDetails,
  canEditAppointmentStatus,
} from "@/utils/permissions";
import { EmailNotificationService } from "@/services/notifications/EmailNotificationService";
import { ClientsPivotRepository } from "@/repositories/ClientsPivotRepository";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";

export class AppointmentService {
  constructor(
    private repository: AppointmentRepository,
    private serviceHandlerService: ServiceHandlerService,
    private orderService: OrderService,
    private userRepository: UserRepository,
    private clientsPivotRepository: ClientsPivotRepository,
  ) {}

  private async isUserLinkedClientForAppointment(
    appointment: { client_id?: string | null },
    userId: string,
  ): Promise<boolean> {
    if (!appointment.client_id) return false;
    try {
      const { dbClient } = await import("@/config/db");
      const { rows } = await dbClient.query(
        "SELECT 1 FROM clients WHERE id = $1 AND user_id = $2 LIMIT 1",
        [appointment.client_id, userId],
      );
      return (rows?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async getAll(
    currentUser?: { userId: string; role: number },
    include?: { service?: boolean; user?: boolean; client?: boolean },
  ): Promise<Array<Appointment & { service?: any; user?: any; client?: any }>> {
    const list =
      currentUser && currentUser.role < 2
        ? await this.repository.getUserAppointments(currentUser.userId)
        : await this.repository.getCompanyAppointments();

    if (!include || (!include.service && !include.user && !include.client)) {
      return list as any;
    }

    const enriched = [] as Array<Appointment & { service?: any; user?: any; client?: any }>;
    for (const appt of list) {
      const item: any = { ...appt };
      if (include.service) {
        try {
          const service = await this.serviceHandlerService.getServiceById(appt.service_id);
          if (service) item.service = service;
          delete item.service_id;
        } catch {}
      }
      if (include.user) {
        try {
          const user = await this.userRepository.findById(appt.user_id);
          if (user) item.user = { ...user, password: undefined } as any;
          delete item.user_id;
        } catch {}
      }
      if (include.client && appt.client_id) {
        try {
          const { dbClient } = await import("@/config/db");
          const { rows } = await dbClient.query(
            `SELECT c.*, u.id as u_id, u.name as u_name, u.email as u_email, u.phone as u_phone, u.address as u_address
             FROM clients c
             LEFT JOIN users u ON u.id = c.user_id
             WHERE c.id = $1`,
            [appt.client_id],
          );
          const row = rows[0];
          if (row) {
            const client: any = {
              id: row.id,
              name: row.name,
              email: row.email,
              phone: row.phone,
              address: row.address,
            };
            if (row.u_id) {
              client.user = {
                id: row.u_id,
                name: row.u_name,
                email: row.u_email,
                phone: row.u_phone,
                address: row.u_address,
              };
            }
            item.client = client;
          }
          delete item.client_id;
        } catch {}
      }
      enriched.push(item);
    }
    return enriched;
  }

  async getById(
    id: string,
    currentUser?: { userId: string; role: number },
    include?: { service?: boolean; user?: boolean; client?: boolean },
  ): Promise<Appointment | (Appointment & { service?: any; user?: any; client?: any }) | null> {
    let appointment;
    try {
      appointment = await this.repository.getAppointmentByIdWithJoins(id);
    } catch (error: any) {
      throw new InternalServerError("Error en la base de datos al buscar el turno");
    }

    if (!appointment) {
      throw new NotFoundError("Turno no encontrado");
    }
    if (currentUser) {
      // Managers+ can access all
      if (currentUser.role >= 3) {
        // allow
      } else if (currentUser.role >= 2) {
        // Staff: only appointments they created
        if (appointment.user_id !== currentUser.userId) {
          throw new ForbiddenError("No tienes permiso para acceder a este turno");
        }
      } else {
        // Clients: allow if creator OR linked client of the appointment
        if (appointment.user_id === currentUser.userId) {
          // ok
        } else {
          const linked = await this.isUserLinkedClientForAppointment(
            appointment,
            currentUser.userId,
          );
          if (!linked) {
            throw new ForbiddenError("No tienes permiso para acceder a este turno");
          }
        }
      }
    }
    if (!include) {
      return appointment;
    }

    const response: any = { ...appointment };

    if (include.service) {
      try {
        const service = await this.serviceHandlerService.getServiceById(appointment.service_id);
        if (service) response.service = service;
        // Remove redundant FK when expanded
        delete response.service_id;
      } catch (_e) {
        // Swallow include errors; keep base response intact
      }
    }

    if (include.user) {
      try {
        const user = await this.userRepository.findById(appointment.user_id);
        if (user) response.user = { ...user, password: undefined } as any;
        // Remove redundant FK when expanded
        delete response.user_id;
      } catch (_e) {
        // Swallow include errors; keep base response intact
      }
    }

    if (include.client && appointment.client_id) {
      try {
        const { dbClient } = await import("@/config/db");
        const { rows } = await dbClient.query(
          `SELECT c.*, u.id as u_id, u.name as u_name, u.email as u_email, u.phone as u_phone, u.address as u_address
           FROM clients c
           LEFT JOIN users u ON u.id = c.user_id
           WHERE c.id = $1`,
          [appointment.client_id],
        );
        const row = rows[0];
        if (row) {
          const client: any = {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            address: row.address,
          };
          if (row.u_id) {
            client.user = {
              id: row.u_id,
              name: row.u_name,
              email: row.u_email,
              phone: row.u_phone,
              address: row.u_address,
            };
          }
          response.client = client;
        }
        delete response.client_id;
      } catch (_e) {}
    }

    return response;
  }

  async updateAppointment(
    id: string,
    updatedData: Partial<Appointment>,
    currentUser?: JwtPayload,
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

    // Load existing for permission checks across fields
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Turno no encontrado");
    }

    // Handle status change permissions
    const maybeStatus = (updatedData as any).status as unknown;
    if (typeof maybeStatus !== "undefined") {
      if (!canEditAppointmentStatus(currentUser as any, existing.user_id)) {
        throw new ForbiddenError("No tienes permiso para cambiar el estado del turno");
      }
    }

    // Handle date change permissions
    if (typeof (dataToUpdate as any).start_date !== "undefined") {
      if (!canEditAppointmentDate(currentUser as any, existing.user_id)) {
        throw new ForbiddenError("No tienes permiso para cambiar la fecha del turno");
      }
    }

    // Handle description/service_id changes: only appointment owner may change
    const changingDetails =
      typeof (dataToUpdate as any).description !== "undefined" ||
      typeof (dataToUpdate as any).service_id !== "undefined";
    if (changingDetails) {
      if (!canEditAppointmentDetails(currentUser as any, existing.user_id)) {
        throw new ForbiddenError(
          "Solo el creador del turno puede editar el servicio o la descripción",
        );
      }
    }

    const updated = await this.repository.update(id, dataToUpdate);
    if (!updated) return null;

    // Fire-and-forget email notifications (TODO: integrate mailer endpoint)
    try {
      if (typeof maybeStatus !== "undefined") {
        await EmailNotificationService.notifyStatusChanged(
          id,
          existing.user_id,
          String(maybeStatus),
        );
      }
      if (typeof (dataToUpdate as any).start_date !== "undefined") {
        const startISO = new Date((dataToUpdate as any).start_date).toISOString();
        await EmailNotificationService.notifyDateChanged(id, existing.user_id, startISO);
      }
    } catch (_e) {
      // swallow email errors; do not block update
    }

    // Return enriched appointment to keep frontend state consistent
    try {
      const enriched = await this.getById(id, currentUser as any, { service: true, user: true });
      if (enriched) return enriched as any;
    } catch {}
    return updated;
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
    currentUser?: { userId: string; role: number },
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
    // Predeclare clientId so we can reference it before full resolution
    let clientId: string | undefined = undefined;
    // Ensure the creator user exists to avoid FK errors (cheap existence check)
    let creatorUserId: string | null = userId;
    let userExists = await this.userRepository.existsById(creatorUserId);
    if (!userExists && clientId) {
      // Fallback: if creator not found but a client was provided, try to use the linked user of that client
      try {
        const { dbClient } = await import("@/config/db");
        const { rows } = await dbClient.query("SELECT user_id FROM clients WHERE id = $1", [
          clientId,
        ]);
        const linkedUserId = rows[0]?.user_id as string | undefined;
        if (linkedUserId) {
          const linkedExists = await this.userRepository.existsById(linkedUserId);
          if (linkedExists) {
            creatorUserId = linkedUserId;
            userExists = true;
          }
        }
      } catch {}
    }
    if (!userExists) {
      throw new BadRequestError("Usuario inválido");
    }

    // Resolve client_id: prefer payload client_id if valid; else map from creator if they are a client
    if (appointmentData.client_id) {
      // Accept either clients.id or users.id
      try {
        const { rows } = await (
          await import("@/config/db")
        ).dbClient.query("SELECT id FROM clients WHERE id = $1", [appointmentData.client_id]);
        if (rows[0]?.id) clientId = rows[0].id;
      } catch {}
      if (!clientId) {
        try {
          const { rows } = await (
            await import("@/config/db")
          ).dbClient.query("SELECT id FROM clients WHERE user_id = $1", [
            appointmentData.client_id,
          ]);
          if (rows[0]?.id) clientId = rows[0].id;
        } catch {}
      }
    }
    if (!clientId) {
      try {
        const { rows } = await (
          await import("@/config/db")
        ).dbClient.query("SELECT id FROM clients WHERE user_id = $1", [userId]);
        if (rows[0]?.id) clientId = rows[0].id;
      } catch {}
    }

    // Ensure appointments.client_id column exists before including it
    if (clientId) {
      try {
        const { dbClient } = await import("@/config/db");
        const { rows } = await dbClient.query(
          "SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'client_id' LIMIT 1",
        );
        const hasColumn = rows && rows.length > 0;
        if (!hasColumn) {
          clientId = undefined;
        }
      } catch {
        clientId = undefined;
      }
    }

    // Determine default status based on role and availability
    let defaultStatus: "pending" | "confirmed" = appointmentRequiresDeposit
      ? "pending"
      : "confirmed";
    if (currentUser && currentUser.role < 2) {
      const available = await this.repository.isSlotAvailable(serviceId, startDate);
      defaultStatus = !appointmentRequiresDeposit && available ? "confirmed" : "pending";
    }

    const appointmentToCreate: Partial<Appointment> = {
      service_id: serviceId,
      user_id: creatorUserId!,
      start_date: startDate,
      description: appointmentData.description || "",
      status: defaultStatus,
    };
    if (clientId) {
      (appointmentToCreate as any).client_id = clientId;
    }

    const createdAppointment = await this.repository.create(appointmentToCreate);
    if (!createdAppointment) {
      throw new Error("Failed to create appointment");
    }

    const newAppointment = await this.getById(createdAppointment.id, currentUser, {
      service: true,
      user: true,
      client: true,
    });

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
      // Allow clients linked to the appointment to generate payment link
      const linked = await this.isUserLinkedClientForAppointment(appointment as any, userId);
      if (!linked) {
        throw new ForbiddenError("No tienes permiso para acceder a este turno");
      }
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

  async getOccupiedSlots(month: string, currentUser: { userId: string; role: number }) {
    // Determine month range
    const now = new Date();
    let year = now.getFullYear();
    let mon = now.getMonth();
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map((n) => parseInt(n, 10));
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        year = y;
        mon = m - 1;
      }
    }
    const start = new Date(year, mon, 1, 0, 0, 0);
    const end = new Date(year, mon + 1, 1, 0, 0, 0);

    // Infer company from current user
    const user = await this.userRepository.findById(currentUser.userId);
    if (!user) throw new ForbiddenError("Usuario inválido");
    const companyId = (user as any).company_id;

    // Query all appointments in company for the range (status != cancelled)
    const { dbClient } = await import("@/config/db");
    const query = `
      SELECT a.start_date, s.duration
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      JOIN users u ON u.id = a.user_id
      WHERE u.company_id = $1
        AND a.status <> 'cancelled'
        AND a.start_date >= $2 AND a.start_date < $3
    `;
    const result = await dbClient.query(query, [companyId, start, end]);

    // Build occupied slots map: { 'YYYY-MM-DD': ['HH:00', ...] }
    const toMinutes = (d: any): number => {
      if (!d) return 60;
      const str = String(d);
      const parts = str.split(":");
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        return h * 60 + m;
      }
      return 60;
    };
    const occupied: Record<string, Set<string>> = {};
    for (const row of result.rows) {
      const d = new Date(row.start_date);
      const minutes = toMinutes(row.duration);
      const slots = Math.max(1, Math.ceil(minutes / 60));
      for (let i = 0; i < slots; i++) {
        const slotDate = new Date(d.getTime() + i * 60 * 60 * 1000);
        const dateKey = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, "0")}-${String(
          slotDate.getDate(),
        ).padStart(2, "0")}`;
        const timeKey = `${String(slotDate.getHours()).padStart(2, "0")}:00`;
        if (!occupied[dateKey]) occupied[dateKey] = new Set();
        occupied[dateKey].add(timeKey);
      }
    }

    const response: Record<string, string[]> = {};
    for (const key of Object.keys(occupied)) {
      response[key] = Array.from(occupied[key]).sort();
    }
    return response;
  }

  async sendReminder(appointmentId: string, currentUser?: JwtPayload): Promise<{ ok: true }> {
    const appt = await this.repository.findById(appointmentId);
    if (!appt) {
      throw new NotFoundError("Turno no encontrado");
    }
    // Allow staff+ or the appointment owner to trigger reminders
    const isOwner = currentUser?.userId === appt.user_id;
    const isStaffOrHigher = (currentUser?.role ?? -1) >= 2;
    if (!isOwner && !isStaffOrHigher) {
      throw new ForbiddenError("No tienes permiso para enviar recordatorios");
    }

    try {
      await EmailNotificationService.sendReminder(appt.id, appt.user_id);
    } catch (_e) {
      // TODO: optionally log the failure somewhere
    }
    return { ok: true };
  }
}
