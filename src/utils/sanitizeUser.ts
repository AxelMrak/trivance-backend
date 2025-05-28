
import { User } from "@entities/User";

export function sanitizeUser(user: User): Omit<User, "password"> {
  const { password, ...sanitized } = user;
  return sanitized;
}

export function sanitizeUsers(users: User[]): Omit<User, "password">[] {
  return users.map(sanitizeUser);
}
