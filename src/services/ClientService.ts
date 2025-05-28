import { sanitizeUser } from "@/utils/sanitizeUser";
import { User, UserRole } from "@entities/User";
import { ClientRepository } from "@repositories/ClientRepository";

export class ClientService {
  constructor(private clientRepository: ClientRepository) {}

  async getClientsByRole(role: UserRole): Promise<Omit<User, "password">[]> {
    console.log(`Fetching clients with role: ${role}`);
    const clients = await this.clientRepository.findWithCondition("role = $1", [role]);
    if (clients.length === 0) {
      throw new Error(`No clients found with ${role} role.`);
    }
    return clients.map(sanitizeUser);
  }

  async getClientByID(id: string): Promise<Omit<User, "password"> | null> {
    const user = await this.clientRepository.findOneWithConditions(
      ["id = $1", "role = $2"],
      [id, UserRole.CLIENT],
    );

    if (!user) {
      throw new Error(`Client with ID ${id} not found.`);
    }

    return sanitizeUser(user);
  }

  async updateClient(id: string, userData: Partial<User>): Promise<Omit<User, "password"> | null> {
    const existingClient = await this.getClientByID(id);
    if (!existingClient) {
      return null;
    }

    if (userData.role && userData.role !== UserRole.CLIENT) {
      throw new Error("Cannot change client role to a non-client role.");
    }

    const updatedClient = await this.clientRepository.update(id, userData);
    return updatedClient ? sanitizeUser(updatedClient) : null;
  }

  async deleteClient(id: string): Promise<boolean> {
    const existingClient = await this.getClientByID(id);
    if (!existingClient) {
      return false;
    }
    await this.clientRepository.delete(id);
    return true;
  }
}
