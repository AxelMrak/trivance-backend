import { BaseRepository } from "@repositories/BaseRepository";
import {Appointment} from "@entities/appointment";

export class AppointmentRepository extends BaseRepository<Appointment> {
  constructor() {
    super('appointments');
  }
}
