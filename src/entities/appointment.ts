import { AppointmentStatus } from "@entities/EnumTypes";

export interface Appointment {
  id: string; // UUID
  user_id: string; // UUID FK
  service_id: string; // UUID FK
  status: AppointmentStatus;
  description?: string;
  start_date: string; // timestamp
  created_at: string;
  updated_at: string;
}

export type AppointmentCreateDTO = {
  service_id: string;
  user_id: string;
  start_date: string;
  description?: string;
  status?: AppointmentStatus;
};
