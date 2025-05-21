import { PublicUserDTO, User } from "@/entities/User";

export function convertToPublicUser(user: User): PublicUserDTO {
  return {
    id: user.id,
    company_id: user.company_id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}