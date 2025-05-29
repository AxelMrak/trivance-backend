import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { Appointment, AppointmentCreateDTO } from "@/entities/appointment";

export class AppointmentService {
  constructor(private repository: AppointmentRepository) {}

  async getAll(): Promise<Appointment[]> {
    const companyID = process.env.COMPANY_ID;
    return this.repository.getCompanyAppointments(companyID || "");
  }

  async getById(id: string): Promise<Appointment | null> {
    return this.repository.findById(id);
  }

  async updateAppointment(
    id: string,
    updatedData: Partial<Appointment>,
  ): Promise<Appointment | null> {
    return this.repository.update(id, updatedData);
  }

  async deleteAppointment(id: string): Promise<string | number | null> {
    const deletedAppointment = await this.repository.delete(id);
    if (!deletedAppointment) {
      throw new Error("Appointment not found");
    }
    return deletedAppointment;
  }

  async createAppointment(appointmentData: Partial<AppointmentCreateDTO>): Promise<Appointment> {
    const companyID = process.env.COMPANY_ID;
    if (!companyID) {
      throw new Error("Company ID is not set");
    }
    return this.repository.create({
      ...appointmentData,
      companyId: companyID,
    });
  }
}

