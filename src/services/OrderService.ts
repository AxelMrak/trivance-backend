import { Order } from "@/entities/Order";
import { OrderRepository } from "@/repositories/OrderRepository";
import { Db } from "@/config/db";

export class OrderService {
  constructor(private repository: OrderRepository) {}

  async getAll(): Promise<Order[]> {
    return this.repository.findAll();
  }

  async getById(id: string, db?: Db): Promise<Order | null> {
    return this.repository.findById(id, db);
  }

  async createOrder(orderData: Partial<Order>, db?: Db): Promise<Order> {
    if (!orderData) {
      throw new Error("Los datos del pedido son obligatorios para crear un pedido.");
    }
    return this.repository.create(orderData, db);
  }

  async updateOrder(id: string, updatedData: Partial<Order>, db?: Db): Promise<Order | null> {
    const existingOrder = await this.getById(id, db);
    if (!existingOrder) {
      return null;
    }
    return this.repository.update(id, updatedData, db);
  }

  async deleteOrder(id: string): Promise<string | number | null> {
    const deletedOrder = await this.repository.delete(id);
    if (!deletedOrder) {
      throw new Error("Orden no encontrada");
    }
    return deletedOrder;
  }

  async getOrderByReference(reference: string): Promise<Order | null> {
    const order = await this.repository.findByField("reference_id", reference);
    if (!order) {
      throw new Error("Orden no encontrada para la referencia dada");
    }
    return order;
  }
}
