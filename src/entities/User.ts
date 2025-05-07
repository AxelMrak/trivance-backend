export enum UserRole {
  GUEST = 0,
  CLIENT = 1,
  STAFF = 2,
  MANAGER = 3,
  ADMIN = 4,
  SUPER_USER = 5,
}

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  name: string | null;
  email: string | null;
  password: string | null;
  confirmedPassword: string | null;
  phone: string | null;
  address: string | null;
}

export interface PublicUserDTO {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}
