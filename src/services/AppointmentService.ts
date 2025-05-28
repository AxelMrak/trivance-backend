import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { Appointment } from "@/entities/appointment";

export class AppointmentService {
  constructor(private repository: AppointmentRepository) {}

  async getAll(): Promise<Appointment[]> {
    return this.repository.findAll();
  }

  async getById(id: string): Promise<Appointment | null> {
    return this.repository.findById(id);
  }

  async create(appointment: Appointment): Promise<Appointment> {
    return this.repository.create(appointment);
  }

  async update(id: string, updatedData: Appointment): Promise<Appointment | null> {
    return this.repository.update(id, updatedData);
  }

  async delete(id: string): Promise<string | number | null> {
    return this.repository.delete(id);
  }

  async getByUserId(userId: string): Promise<Appointment[]> {
    return this.repository.findByUserId(userId);
  }

  async getByServiceId(serviceId: string): Promise<Appointment[]> {
    return this.repository.findByServiceId(serviceId);
  }

  async setStatus(id: string, status: number): Promise<Appointment | null> {
    const appointment = await this.repository.findById(id);
    if (!appointment) return null;

    appointment.enumStatus = status;
    return this.repository.update(id, appointment);
  }

  async cancel(id: string): Promise<Appointment | null> {
    return this.setStatus(id, 0); 
  }

  async confirm(id: string): Promise<Appointment | null> {
    return this.setStatus(id, 1); 
  }

  async markPending(id: string): Promise<Appointment | null> {
    return this.setStatus(id, 2);
  }
}