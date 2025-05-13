import { Session } from "@entities/Session";
import { BaseRepository } from "@repositories/BaseRepository";
export class ServicesRepository extends BaseRepository<Session> {
  constructor() {
    super("sessions");
  }
}