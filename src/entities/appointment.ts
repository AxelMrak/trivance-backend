export enum AppointmentStatus {
  Pending = 2,
  Confirmed = 1,
  Cancelled = 0,
}

export interface AppointmentUser {
  id: string;
  name: string;
}

export interface AppointmentService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export interface Appointment {
  id: string;
  serviceId: string;
  userId: string;
  companyId: string;
  status: AppointmentStatus;
  startDate: Date;
  endDate: Date;
  time: string; 
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  user: AppointmentUser;
  service: AppointmentService;
}

export type AppointmentCreateDTO = {
  service_id: string;
  user_id: string;
  start_date: Date;
  time: string;
  description?: string;
};
