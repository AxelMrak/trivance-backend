import { randomUUID, UUID } from "crypto";

enum UserRole {
  CLIENT = 0,
  STAFF = 1,
  ADMIN = 2,
  SUPERUSER = 3,
}

export class User {
  id: UUID;
  companyID: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;

  constructor(
    name: string,
    companyID: string,
    email: string,
    password: string,
    role: UserRole = UserRole.CLIENT,
  ) {
    this.id = randomUUID();
    this.companyID = companyID;
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
  }
}
