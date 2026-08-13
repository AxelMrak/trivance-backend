import { ClientsRepository, ClientEntity } from "@/repositories/ClientsRepository";
import { UserRepository } from "@/repositories/UserRepository";

type ClientDTO = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  user_id: string | null;
  company_id: string | null;
  created_at?: string | Date;
};

const toDTO = (c: ClientEntity): ClientDTO => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
  user_id: c.user_id,
  company_id: c.company_id,
  created_at: c.created_at,
});

export class ClientService {
  constructor(
    private clientsRepository: ClientsRepository,
    private userRepository: UserRepository,
  ) {}

  async getAllClients(): Promise<ClientDTO[]> {
    const list = await this.clientsRepository.findAll();
    const userIds = list.filter((c) => c.user_id).map((c) => c.user_id) as string[];
    let usersById = new Map<string, any>();
    let rolesByUserId = new Map<string, number>();
    if (userIds.length) {
      const users = await this.userRepository.findPublicByIds(userIds);
      usersById = new Map(users.map((u: any) => [u.id, u]));
      const roles = await this.userRepository.findRolesByUserIds(userIds);
      rolesByUserId = new Map(roles.map((r: any) => [r.user_id, r.role_level]));
    }
    // Filter: only standalone clients (user_id IS NULL) or user linked with CLIENT role (1)
    const filtered = list.filter((c) => !c.user_id || rolesByUserId.get(c.user_id) === 1);

    return filtered.map((c) => {
      const user = c.user_id ? usersById.get(c.user_id) : null;
      const dto = toDTO(c);
      dto.name = dto.name ?? user?.name ?? null;
      dto.email = dto.email ?? user?.email ?? null;
      dto.phone = dto.phone ?? user?.phone ?? null;
      dto.address = dto.address ?? user?.address ?? null;
      return dto;
    });
  }

  async getClientByID(id: string): Promise<ClientDTO | null> {
    const client = await this.clientsRepository.findById(id);
    if (!client) return null;
    const dto = toDTO(client);
    if (client.user_id) {
      const user = await this.userRepository.findPublicById(client.user_id);
      dto.name = dto.name ?? user?.name ?? null;
      dto.email = dto.email ?? user?.email ?? null;
      dto.phone = dto.phone ?? user?.phone ?? null;
      dto.address = dto.address ?? user?.address ?? null;
    }
    return dto;
  }

  async updateClient(id: string, data: Partial<ClientDTO>): Promise<ClientDTO | null> {
    const allowed: Partial<ClientEntity> = {};
    if (typeof data.name !== "undefined") allowed.name = data.name as any;
    if (typeof data.email !== "undefined") allowed.email = data.email as any;
    if (typeof data.phone !== "undefined") allowed.phone = data.phone as any;
    if (typeof data.address !== "undefined") allowed.address = data.address as any;
    const updated = await this.clientsRepository.update(id, allowed);
    if (!updated) return null;
    // enrich like getClientByID
    const dto = toDTO(updated);
    if (updated.user_id) {
      const user = await this.userRepository.findPublicById(updated.user_id);
      dto.name = dto.name ?? user?.name ?? null;
      dto.email = dto.email ?? user?.email ?? null;
      dto.phone = dto.phone ?? user?.phone ?? null;
      dto.address = dto.address ?? user?.address ?? null;
    }
    return dto;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clientsRepository.delete(id);
  }

  async createClient(
    data: Pick<ClientDTO, "name" | "email" | "phone" | "address">,
    companyId: string | null = null,
  ): Promise<ClientDTO> {
    const created = await this.clientsRepository.create({
      company_id: companyId,
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      user_id: null,
    });
    return toDTO(created);
  }
}
