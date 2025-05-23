import { User, UserRole } from "@entities/User";
import { ClientRepository } from "@repositories/ClientRepository";

export class ClientService {
  constructor(private clientRepository: ClientRepository) {}

  async getClientsByRole(role: UserRole): Promise<User[]> {
    const clients = await this.clientRepository.findWithCondition("role = ?", [role]);
    return clients;
  }

  async getClientByID(id: string): Promise<User | null> {
    const user = await this.clientRepository.findById(id);
    if (user && user.role === UserRole.CLIENT) {
      return user;
    }
    return null;
  }

  async updateClient(id: string, userData: Partial<User>): Promise<User | null> {
    const existingClient = await this.getClientByID(id);
    if (!existingClient) {
      return null;
    }

    if (userData.role && userData.role !== UserRole.CLIENT) {
      throw new Error("Cannot change client role to a non-client role.");
    }

    return this.clientRepository.update(id, userData);
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
