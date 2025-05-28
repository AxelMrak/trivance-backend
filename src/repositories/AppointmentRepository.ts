import { BaseRepository } from "./BaseRepository";
import { Appointment } from "@/entities/appointment";

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
}