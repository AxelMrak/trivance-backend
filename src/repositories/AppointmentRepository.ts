import { BaseRepository } from "./BaseRepository";
import { Appointment, AppointmentStatus } from "@/entities/appointment";
import { dbClient } from "@/config/db";

export class AppointmentRepository extends BaseRepository<Appointment> {
  constructor() {
    super("appointments");
  }

  async findByUserId(userId: string): Promise<Appointment[]> {
    return this.findManyByField("user_id", userId);
  }

  async findByServiceId(serviceId: string): Promise<Appointment[]> {
    return this.findManyByField("service_id", serviceId);
  }

  async setStatus(id: string, status: AppointmentStatus): Promise<Appointment | null> {
    return this.update(id, { status });
  }

  async findUpcomingByUserId(userId: string, fromDate: Date): Promise<Appointment[]> {
    const whereClause = `user_id = $1 AND start_time >= $2 ORDER BY start_time ASC`;
    const values = [userId, fromDate];
    try {
      const query = `SELECT * FROM ${this.table} WHERE ${whereClause}`;
      const result = await dbClient.query(query, values);
      return result.rows;
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      throw new Error("Database error");
    }
  }
}