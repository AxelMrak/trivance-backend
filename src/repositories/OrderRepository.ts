import { BaseRepository } from "@/repositories/BaseRepository";
import { Order } from "@/entities/Order";

export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super("orders");
  }
}
