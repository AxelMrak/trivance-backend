import { Appointment } from "@/entities/Appointment";
import { Db } from "@/config/db";
import { BaseRepository } from "@/repositories/BaseRepository";
import { handleDatabaseError } from "@/errors/persistenceErrors";
import {
  generateGetAppointmentByIdWithJoinsQuery,
  generateGetAppointmentsWithJoinsQuery,
} from "@/queries/AppointmentQueries";

export class AppointmentRepository extends BaseRepository<Appointment> {
  constructor(db: Db) {
    super(db, "appointments");
  }

  async getCompanyAppointments(companyId: string, db?: Db): Promise<Appointment[]> {
    const executor = db ?? this.db;
    try {
      const query = generateGetAppointmentsWithJoinsQuery();
      const result = await executor.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      // Fallback for environments without new columns (e.g., client_id not migrated yet)
      try {
        const legacyQuery = `
          SELECT
            a.id,
            a.user_id,
            a.service_id,
            a.status,
            a.description,
            a.start_date,
            a.created_at,
            a.updated_at
          FROM appointments a
          JOIN services s ON s.id = a.service_id
          WHERE s.company_id = $1
          ORDER BY a.start_date DESC
        `;
        const result = await executor.query(legacyQuery, [companyId]);
        return result.rows as any;
      } catch (innerError) {
        handleDatabaseError(innerError);
      }
    }
  }

  async getAppointmentByIdWithJoins(
    appointmentId: string,
    companyId: string,
    db?: Db,
  ): Promise<Appointment | null> {
    const executor = db ?? this.db;
    try {
      const query = generateGetAppointmentByIdWithJoinsQuery();
      const result = await executor.query(query, [appointmentId, companyId]);
      return result.rows[0] || null;
    } catch (error) {
      // Fallback for environments without new columns
      try {
        const legacyQuery = `
          SELECT
            a.id,
            a.user_id,
            a.service_id,
            a.status,
            a.description,
            a.start_date,
            a.created_at,
            a.updated_at
          FROM appointments a
          JOIN services s ON s.id = a.service_id
          WHERE a.id = $1 AND s.company_id = $2
        `;
        const result = await executor.query(legacyQuery, [appointmentId, companyId]);
        return result.rows[0] || null;
      } catch (innerError) {
        handleDatabaseError(innerError);
      }
    }
  }

  async getUserAppointments(userId: string, db?: Db): Promise<Appointment[]> {
    const executor = db ?? this.db;
    try {
      const query = `
        SELECT a.id, a.user_id, a.client_id, a.service_id, a.status, a.description, a.start_date, a.created_at, a.updated_at
        FROM appointments a
        LEFT JOIN clients c ON c.id = a.client_id
        WHERE (c.user_id = $1) OR (a.client_id IS NULL AND a.user_id = $1)
        ORDER BY a.start_date DESC
      `;
      const result = await executor.query(query, [userId]);
      return result.rows;
    } catch (_e) {
      // Fallback if clients table or client_id is not available yet
      try {
        const legacy = `
          SELECT a.id, a.user_id, a.service_id, a.status, a.description, a.start_date, a.created_at, a.updated_at
          FROM appointments a
          WHERE a.user_id = $1
          ORDER BY a.start_date DESC
        `;
        const result = await executor.query(legacy, [userId]);
        return result.rows as any;
      } catch (innerError) {
        handleDatabaseError(innerError);
      }
    }
  }

  async isSlotAvailable(serviceId: string, startDate: Date, db?: Db): Promise<boolean> {
    const executor = db ?? this.db;
    try {
      const query = `
        WITH new_service AS (
          SELECT duration FROM services WHERE id = $1
        )
        SELECT COUNT(*)::int AS cnt
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        CROSS JOIN new_service ns
        WHERE a.service_id = $1
          AND a.status <> 'cancelled'
          AND tsrange(a.start_date, a.start_date + s.duration::interval, '[)') &&
              tsrange($2::timestamp, $2::timestamp + ns.duration::interval, '[)')
      `;
      const result = await executor.query(query, [serviceId, startDate]);
      const count = Number(result.rows[0]?.cnt || 0);
      return count === 0;
    } catch (error) {
      // "No sé" no es lo mismo que "no libre": una caída de DB no debe decidir
      // el status del turno en silencio. Propagar.
      handleDatabaseError(error);
    }
  }

  async getAvailableSlotsInRange(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ start_date: Date; duration: string }>> {
    const query = `
      SELECT a.start_date, s.duration
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      JOIN users u ON u.id = a.user_id
      WHERE u.company_id = $1
        AND a.status <> 'cancelled'
        AND a.start_date >= $2 AND a.start_date < $3
      ORDER BY a.start_date ASC
    `;
    const { rows } = await this.db.query(query, [companyId, from, to]);
    return rows;
  }

  async hasClientIdColumn(): Promise<boolean> {
    const { rows } = await this.db.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'client_id' LIMIT 1",
    );
    return (rows?.length ?? 0) > 0;
  }

  async searchByTerm(
    scope: { type: "client"; userId: string } | { type: "company"; companyId: string },
    like: string,
    limit: number,
  ): Promise<any[]> {
    if (scope.type === "client") {
      const { rows } = await this.db.query(
        `SELECT a.id, a.start_date, a.status, s.name as service_name,
                COALESCE(cu.name, u.name) as client_name
         FROM appointments a
         JOIN services s ON s.id = a.service_id
         JOIN users u ON u.id = a.user_id
         LEFT JOIN clients c ON c.id = a.client_id
         LEFT JOIN users cu ON cu.id = c.user_id
         WHERE (a.user_id = $1 OR c.user_id = $1)
           AND ($2 = '%%' OR s.name ILIKE $2 OR a.description ILIKE $2 OR cu.name ILIKE $2)
         ORDER BY a.start_date DESC
         LIMIT $3`,
        [scope.userId, like, limit],
      );
      return rows;
    }
    const { rows } = await this.db.query(
      `SELECT a.id, a.start_date, a.status, s.name as service_name,
              COALESCE(cu.name, u.name) as client_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN users u ON u.id = a.user_id
       LEFT JOIN clients c ON c.id = a.client_id
       LEFT JOIN users cu ON cu.id = c.user_id
       WHERE u.company_id = $1
         AND ($2 = '%%' OR s.name ILIKE $2 OR a.description ILIKE $2 OR cu.name ILIKE $2 OR u.name ILIKE $2)
       ORDER BY a.start_date DESC
       LIMIT $3`,
      [scope.companyId, like, limit],
    );
    return rows;
  }
}
