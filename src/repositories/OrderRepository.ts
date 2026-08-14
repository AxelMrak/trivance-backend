import { BaseRepository } from "@/repositories/BaseRepository";
import { Db } from "@/config/db";
import { Order } from "@/entities/Order";

export class OrderRepository extends BaseRepository<Order> {
  constructor(db: Db) {
    super(db, "orders");
  }

  async findByReference(reference: string, db?: Db): Promise<Order | undefined> {
    const order = await this.findByField("reference_id", reference, db);
    return order ?? undefined;
  }
}
