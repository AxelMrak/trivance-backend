import { Response, NextFunction } from "express";

import { AuthRequest } from "@/middlewares/authmiddleware";
import { OrderService } from "@/services/OrderService";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { ClientsRepository } from "@/repositories/ClientsRepository";

export class OrderController {
  constructor(
    private orderService: OrderService,
    private appointmentRepository: AppointmentRepository,
    private clientsRepository: ClientsRepository,
  ) {}

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const includeParam = (req.query?.include as string) || "";
      const includeList = includeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const includeAppointment = includeList.includes("appointment");

      const order = await this.orderService.getById(id);
      if (!order) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }

      // If we are going to include the appointment, prefer loading via the byId helper
      // to avoid duplicate DB queries; otherwise a lean find is enough.
      const appt = includeAppointment
        ? await this.appointmentRepository.getAppointmentByIdWithJoins(
            order.appointment_id,
            (currentUser as any)?.company_id ?? "",
          )
        : await this.appointmentRepository.findById(order.appointment_id);
      if (!appt) {
        // If appointment cannot be loaded, restrict to staff+
        if (!currentUser || (currentUser.role ?? 0) < 2) {
          return res.status(403).json({ message: "No autorizado" });
        }
      } else {
        const isOwner = currentUser && currentUser.userId === appt.user_id;
        const isStaff = currentUser && (currentUser.role ?? 0) >= 2;
        let isLinkedClient = false;
        if (!isOwner && !isStaff && (appt as any).client_id) {
          isLinkedClient = await this.clientsRepository.isLinkedToUser(
            (appt as any).client_id,
            currentUser?.userId ?? "",
          );
        }

        if (!isOwner && !isStaff && !isLinkedClient) {
          return res.status(403).json({ message: "No autorizado" });
        }

        // If appointment was requested, attach a normalized object
        if (includeAppointment) {
          // Keep only appointment fields; relationships (user/client/service) may be absent
          // depending on repository implementation. The frontend handles optional fields.
          (order as any).appointment = appt;
        }
      }

      const base = {
        id: order.id,
        status: order.status,
        appointmentId: order.appointment_id,
      } as any;
      if (includeAppointment && (order as any).appointment) {
        base.appointment = (order as any).appointment;
      }
      return res.json(base);
    } catch (error) {
      next(error);
    }
  };
}
