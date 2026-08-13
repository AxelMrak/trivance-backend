import { Session } from "@entities/Session";
import { Db } from "@/config/db";
import { BaseRepository } from "@repositories/BaseRepository";
export class SessionRepository extends BaseRepository<Session> {
  constructor(db: Db) {
    super(db, "sessions");
  }
}
