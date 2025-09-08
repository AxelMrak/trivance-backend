import { Request, Response, NextFunction } from "express";
import { UserRepository } from "@/repositories/UserRepository";

export class SearchController {
  constructor(private userRepository: UserRepository) {}

  globalSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = String(req.query.q || "").trim();
      const limit = Math.min(parseInt(String(req.query.limit || "5"), 10) || 5, 20);
      const auth = (req as any).user as { userId: string; role: number };
      if (!auth?.userId) return res.status(401).json({ message: "No autenticado" });

      const user = await this.userRepository.findById(auth.userId);
      if (!user) return res.status(401).json({ message: "Usuario inválido" });
      const companyId = (user as any).company_id;

      const { dbClient } = await import("@/config/db");
      const like = `%${q}%`;

      // Services for company
      const servicesPromise = dbClient.query(
        `SELECT id, name, description FROM services WHERE company_id = $1 AND ($2 = '%%' OR name ILIKE $2 OR description ILIKE $2) ORDER BY name LIMIT $3`,
        [companyId, like, limit],
      );

      // Appointments: filter by role
      let apptQuery: string;
      let apptParams: any[];
      if ((auth.role ?? 0) < 2) {
        // Clients: only own appointments (as creator or linked client)
        apptQuery = `
          SELECT a.id, a.start_date, a.status, s.name as service_name,
                 COALESCE(cu.name, u.name) as client_name
          FROM appointments a
          JOIN services s ON s.id = a.service_id
          JOIN users u ON u.id = a.user_id
          LEFT JOIN clients c ON c.id = a.client_id
          LEFT JOIN users cu ON cu.id = c.user_id
          WHERE (a.user_id = $1 OR c.user_id = $1)
            AND ($2 = '%%' OR s.name ILIKE $2 OR a.description ILIKE $2 OR cu.name ILIKE $2)
          ORDER BY a.start_date DESC
          LIMIT $3
        `;
        apptParams = [auth.userId, like, limit];
      } else {
        // Staff+: all company appointments
        apptQuery = `
          SELECT a.id, a.start_date, a.status, s.name as service_name,
                 COALESCE(cu.name, u.name) as client_name
          FROM appointments a
          JOIN services s ON s.id = a.service_id
          JOIN users u ON u.id = a.user_id
          LEFT JOIN clients c ON c.id = a.client_id
          LEFT JOIN users cu ON cu.id = c.user_id
          WHERE u.company_id = $1
            AND ($2 = '%%' OR s.name ILIKE $2 OR a.description ILIKE $2 OR cu.name ILIKE $2 OR u.name ILIKE $2)
          ORDER BY a.start_date DESC
          LIMIT $3
        `;
        apptParams = [companyId, like, limit];
      }
      // Clients for staff+
      let clientsRows: any[] = [];
      if ((auth.role ?? 0) >= 2) {
        const clientsQuery = `
          SELECT c.id, COALESCE(c.name, cu.name) as name, COALESCE(c.email, cu.email) as email
          FROM clients c
          LEFT JOIN users cu ON cu.id = c.user_id
          LEFT JOIN user_roles ur ON ur.user_id = cu.id
          WHERE (c.company_id = $1 OR cu.company_id = $1)
            AND ($2 = '%%' OR COALESCE(c.name, cu.name) ILIKE $2 OR COALESCE(c.email, cu.email) ILIKE $2)
            AND (c.user_id IS NULL OR ur.role_level = 1)
          ORDER BY name NULLS LAST
          LIMIT $3
        `;
        const { rows } = await dbClient.query(clientsQuery, [companyId, like, limit]);
        clientsRows = rows;
      }

      const [servicesRes, apptsRes] = await Promise.all([
        servicesPromise,
        dbClient.query(apptQuery, apptParams),
      ]);

      const results: Array<{ type: string; id: string; title: string; subtitle?: string; href?: string }> = [];
      const mapStatus = (s: string) => (s === 'confirmed' ? 'Confirmado' : s === 'pending' ? 'Pendiente' : s === 'cancelled' ? 'Cancelado' : s);
      for (const s of servicesRes.rows) {
        results.push({
          type: "Servicio",
          id: s.id,
          title: s.name,
          subtitle: s.description || "Servicio",
        });
      }
      for (const a of apptsRes.rows) {
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
          title: c.name || c.email || 'Cliente',
          subtitle: c.email || undefined,
        });
      }

      res.json(results);
    } catch (error) {
      next(error);
    }
  };
}
