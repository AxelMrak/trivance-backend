import { Session } from "@entities/Session";
import { BaseRepository } from "@repositories/BaseRepository";
import { dbClient } from "@/config/db";
export class SessionRepository extends BaseRepository<Session> {
  constructor() {
    super("sessions"); 
  }
}
