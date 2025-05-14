import { Service } from "@entities/Service";
import { BaseRepository } from "@repositories/BaseRepository";

export class ServicesRepository extends BaseRepository<Service> {
  constructor() {
    super("services");
  }
}
