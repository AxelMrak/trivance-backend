export enum AppointmentStatus {
    Pending = 2,
    Confirmed = 1,
    Cancelled = 0,
  }
  
  export interface Appointment {
    id: string;
    serviceId: string;
    userId: string;
    enumStatus: AppointmentStatus;
    startTime: Date;
    endTime: Date;
    createdAt: Date;
    description?: string;
  }
  export type AppointmentCreateDTO = {
    serviceId: string;
    userId: string;
    startTime: Date;
    endTime: Date;
    enumStatus: AppointmentStatus;
    description?: string;
  };
