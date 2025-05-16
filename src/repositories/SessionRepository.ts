import { Session } from "@entities/Session";
import { BaseRepository } from "@repositories/BaseRepository";
export class SessionRepository extends BaseRepository<Session> {
  constructor() {
    super("sessions");
  }
}
