import { AppointmentStatus } from "@entities/EnumTypes";

export interface Appointment {
  id: string; // UUID
  user_id: string; // UUID FK (creator)
  client_id?: string | null; // UUID FK to clients (optional)
  service_id: string; // UUID FK
  status: AppointmentStatus;
  description?: string;
  start_date: Date; // timestamp
  created_at: Date;
  updated_at: Date;
}

export type AppointmentCreateDTO = {
  service_id: string;
  start_date: string | Date;
  description?: string;
  status?: AppointmentStatus;
  client_id?: string;
};
