export enum AppointmentStatus {
  Pending = 2,
  Confirmed = 1,
  Cancelled = 0,
}

export interface Appointment {
  id: string;
  serviceId: string;
  userId: string;
  companyId: string;
  status: AppointmentStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  description?: string;
}
export type AppointmentCreateDTO = {
  service_id: string;
  user_id: string;
  company_id: string;
  start_date: Date;
  status: AppointmentStatus;
  description?: string;
};
