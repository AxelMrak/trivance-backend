import { Appointment } from "@/entities/Appointment";
import { dbClient } from "@/config/db";
import { BaseRepository } from "@/repositories/BaseRepository";
import { handleDatabaseError } from "@/errors/persistenceErrors";
import {
  generateGetAppointmentByIdWithJoinsQuery,
  generateGetAppointmentsWithJoinsQuery,
} from "@/queries/AppointmentQueries";

export class AppointmentRepository extends BaseRepository<Appointment> {
  constructor() {
    super("appointments");
  }

  async getCompanyAppointments(): Promise<Appointment[]> {
    try {
      const query = generateGetAppointmentsWithJoinsQuery();
      const result = await dbClient.query(query);
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
          ORDER BY a.start_date DESC
        `;
        const result = await dbClient.query(legacyQuery);
        return result.rows as any;
      } catch (innerError) {
        handleDatabaseError(innerError);
      }
    }
  }

  async getAppointmentByIdWithJoins(appointmentId: string): Promise<Appointment | null> {
    try {
      const query = generateGetAppointmentByIdWithJoinsQuery();
      const result = await dbClient.query(query, [appointmentId]);
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
          WHERE a.id = $1
        `;
        const result = await dbClient.query(legacyQuery, [appointmentId]);
        return result.rows[0] || null;
      } catch (innerError) {
        handleDatabaseError(innerError);
      }
    }
  }

  async getUserAppointments(userId: string): Promise<Appointment[]> {
    try {
      const query = `
        SELECT a.id, a.user_id, a.client_id, a.service_id, a.status, a.description, a.start_date, a.created_at, a.updated_at
        FROM appointments a
        LEFT JOIN clients c ON c.id = a.client_id
        WHERE (c.user_id = $1) OR (a.client_id IS NULL AND a.user_id = $1)
        ORDER BY a.start_date DESC
      `;
      const result = await dbClient.query(query, [userId]);
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
        const result = await dbClient.query(legacy, [userId]);
        return result.rows as any;
      } catch (innerError) {
        handleDatabaseError(innerError);
      }
    }
  }

  async isSlotAvailable(serviceId: string, startDate: Date): Promise<boolean> {
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
      const result = await dbClient.query(query, [serviceId, startDate]);
      const count = Number(result.rows[0]?.cnt || 0);
      return count === 0;
    } catch (_e) {
      // If DB fails, be conservative: assume no availability
      return false;
    }
  }
}
