import { Service } from "@entities/Service";
import { Db } from "@/config/db";
import { BaseRepository } from "@repositories/BaseRepository";

export class ServiceRepository extends BaseRepository<Service> {
  constructor(db: Db) {
    super(db, "services");
  }
}
