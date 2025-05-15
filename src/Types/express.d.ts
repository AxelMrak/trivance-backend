import { User } from "@/entities/User"; 

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "company_id" | "name" | "email" | "role">;
    }
  }
}