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
