import { Service } from "@entities/Service";
import { BaseRepository } from "@repositories/BaseRepository";

export class ServiceRepository extends BaseRepository<Service> {
  constructor() {
    super("services");
  }
}
