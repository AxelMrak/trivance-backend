import { Appointment, AppointmentStatus } from "@/entities/appointment";
import { dbClient } from "@/config/db";

import { BaseRepository } from "./BaseRepository";
import {
  generateGetAppointmentByIdWithJoinsQuery,
  generateGetAppointmentsWithJoinsQuery,
} from "@/queries/AppointmentQueries";

export class AppointmentRepository extends BaseRepository<Appointment> {
  constructor() {
    super("appointments");
  }

  async getCompanyAppointments(companyId: string): Promise<Appointment[]> {
    try {
      const query = generateGetAppointmentsWithJoinsQuery();
      const result = await dbClient.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      console.error("Error fetching company appointments:", error);
      throw new Error("Database error");
    }
  }

  async getAppointmentByIdWithJoins(
    companyId: string,
    appointmentId: string,
  ): Promise<Appointment | null> {
    try {
      const query = generateGetAppointmentByIdWithJoinsQuery();
      const result = await dbClient.query(query, [companyId, appointmentId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching appointment by ID with joins:", error);
      throw new Error("Database error");
    }
  }
}
