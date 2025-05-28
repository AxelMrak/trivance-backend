export enum AppointmentStatus {
    Pending = 2,
    Confirmed = 1,
    Cancelled = 0,
  }
  
  export interface Appointment {
    id: string;
    serviceId: string;
    userId: string;
    status: AppointmentStatus;
    startTime: Date;
    endTime: Date;
    createdAt: Date;
    description?: string;
  }
  export type AppointmentCreateDTO = {
    service_id: string;
    user_id: string;
    start_time: Date;
    end_time: Date;
    status: AppointmentStatus;
    description?: string;
  };
