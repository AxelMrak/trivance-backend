import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { Appointment, AppointmentCreateDTO } from "@/entities/appointment";
import { ServicesRepository } from "@/repositories/ServiceRepository";
const companyID = process.env.COMPANY_ID || "";

export class AppointmentService {
  constructor(private repository: AppointmentRepository, private serviceRepository: ServicesRepository) {}

  async getAll(): Promise<Appointment[]> {
    return this.repository.getCompanyAppointments(companyID);
  }

  async getById(id: string): Promise<Appointment | null> {
    const appointment = await this.repository.getAppointmentByIdWithJoins(companyID, id);
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    return appointment;
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
    const { service_id, start_date, user_id, description, time } = appointmentData;

    if (!service_id || !start_date || !user_id || !time) {
      throw new Error("missing required fields: service_id, start_date, user_id, time");
    }
  
    const service = await this.serviceRepository.findById(service_id);
    if (!service) {
      throw new Error("Service not found");
    }
    
    const dateOnly = new Date(start_date);
    dateOnly.setUTCHours(0, 0, 0, 0); 
    const [hour, minute] = time.split(":").map(Number);
    const startDateTime = new Date(dateOnly);
    startDateTime.setUTCHours(hour, minute, 0, 0);
  
    const duration = Number(service.duration);
    const endDate = new Date(startDateTime.getTime() + duration * 60000);

    const appointment = await this.repository.create({
      serviceId: service_id,
      userId: user_id,
      startDate: dateOnly,
      time: time, 
      endDate,
      description,
      status: 2, 
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return appointment;
  }
}
