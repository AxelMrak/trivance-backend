import { Request, Response, NextFunction } from "express";

import { UserRepository } from "@/repositories/UserRepository";
import { ServiceRepository } from "@/repositories/ServiceRepository";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { ClientsRepository } from "@/repositories/ClientsRepository";

export class SearchController {
  constructor(
    private userRepository: UserRepository,
    private serviceRepository: ServiceRepository,
    private appointmentRepository: AppointmentRepository,
    private clientsRepository: ClientsRepository,
  ) {}

  globalSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = String(req.query.q || "").trim();
      const limit = Math.min(parseInt(String(req.query.limit || "5"), 10) || 5, 20);
      const auth = (req as any).user as { userId: string; role: number };
      if (!auth?.userId) return res.status(401).json({ message: "No autenticado" });

      const user = await this.userRepository.findById(auth.userId);
      if (!user) return res.status(401).json({ message: "Usuario inválido" });
      const companyId = (user as any).company_id;

      const like = `%${q}%`;

      const servicesPromise = this.serviceRepository.searchByTerm(companyId, like, limit);

      const apptsPromise =
        (auth.role ?? 0) < 2
          ? this.appointmentRepository.searchByTerm(
              { type: "client", userId: auth.userId },
              like,
              limit,
            )
          : this.appointmentRepository.searchByTerm({ type: "company", companyId }, like, limit);

      const clientsPromise =
        (auth.role ?? 0) >= 2
          ? this.clientsRepository.searchByTerm(companyId, like, limit)
          : Promise.resolve([]);

      const [servicesRes, apptsRes, clientsRows] = await Promise.all([
        servicesPromise,
        apptsPromise,
        clientsPromise,
      ]);

      const results: Array<{
        type: string;
        id: string;
        title: string;
        subtitle?: string;
        href?: string;
      }> = [];
      const mapStatus = (s: string) =>
        s === "confirmed"
          ? "Confirmado"
          : s === "pending"
            ? "Pendiente"
            : s === "cancelled"
              ? "Cancelado"
              : s;
      for (const s of servicesRes) {
        results.push({
          type: "Servicio",
          id: s.id,
          title: s.name,
          subtitle: s.description || "Servicio",
        });
      }
      for (const a of apptsRes) {
        const date = new Date(a.start_date);
        const dateStr = date.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
        results.push({
          type: "Turno",
          id: a.id,
          title: `Turno • ${a.service_name}`,
          subtitle: `${dateStr} • ${mapStatus(a.status)} • ${a.client_name || ""}`,
          href: `/dashboard/appointments/${a.id}`,
        });
      }
      for (const c of clientsRows) {
        results.push({
          type: "Cliente",
          id: c.id,
          title: c.name || c.email || "Cliente",
          subtitle: c.email || undefined,
        });
      }

      res.json(results);
    } catch (error) {
      next(error);
    }
  };
}
