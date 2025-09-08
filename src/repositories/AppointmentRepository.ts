import { Appointment } from "@/entities/Appointment";
import { dbClient } from "@/config/db";
import { BaseRepository } from "@/repositories/BaseRepository";
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
      throw new Error("Error de base de datos");
    }
  }

  async getAppointmentByIdWithJoins(appointmentId: string): Promise<Appointment | null> {
    try {
      const query = generateGetAppointmentByIdWithJoinsQuery();
      const result = await dbClient.query(query, [appointmentId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error("Error de base de datos");
    }
  }
}
