import { OrderStatus } from "@entities/EnumTypes";

export interface Order {
  id: string; // UUID
  appointment_id: string; // UUID FK
  provider: string;
  reference_id: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export type CreateOrderDto = Omit<Order, "id" | "created_at" | "updated_at">;
