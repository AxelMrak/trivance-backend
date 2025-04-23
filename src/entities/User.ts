export enum UserRole {
  INVITED = 0,
  STAFF = 1,
  ADMIN = 2,
  SUPER_USER = 3,
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  company_id: string;
  created_at: string;
  role: UserRole;
}

export type CreateUserDTO = Omit<User, "id" | "created_at" | "company_id" | "role">;
