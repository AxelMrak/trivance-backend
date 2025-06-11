import { Order } from "@/entities/Order";
import { OrderRepository } from "@/repositories/OrderRepository";

export class OrderService {
  constructor(private repository: OrderRepository) {}

  async getAll(): Promise<Order[]> {
    return this.repository.findAll();
  }

  async getById(id: string): Promise<Order | null> {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new Error("Order not found");
    }
    return order;
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    if (!orderData) {
      throw new Error("Order data is required to create an order.");
    }
    return this.repository.create(orderData);
  }

  async updateOrder(id: string, updatedData: Partial<Order>): Promise<Order | null> {
    const existingOrder = await this.getById(id);
    if (!existingOrder) {
      return null;
    }
    return this.repository.update(id, updatedData);
  }

  async deleteOrder(id: string): Promise<string | number | null> {
    const deletedOrder = await this.repository.delete(id);
    if (!deletedOrder) {
      throw new Error("Order not found");
    }
    return deletedOrder;
  }
}
