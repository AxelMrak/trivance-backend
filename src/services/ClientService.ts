import { sanitizeUser } from "@/utils/sanitizeUser";
import { User, UserRole } from "@entities/User";
import { ClientRepository } from "@repositories/ClientRepository";

export class ClientService {
  constructor(private clientRepository: ClientRepository) {}

  async getClientsByRole(role: UserRole): Promise<Omit<User, "password">[]> {
    const clients = await this.clientRepository.findWithCondition("role = $1", [role]);
    if (clients.length === 0) {
      throw new Error(`No se encontraron clientes con el Rol ${role}.`);
    }
    return clients.map(sanitizeUser);
  }

  async getClientByID(id: string): Promise<Omit<User, "password"> | null> {
    const user = await this.clientRepository.findOneWithConditions(
      ["id = $1", "role = $2"],
      [id, UserRole.CLIENT],
    );

    if (!user) {
      throw new Error(`Cliente con ID ${id} no encontrado.`);
    }

    return sanitizeUser(user);
  }

  async updateClient(id: string, userData: Partial<User>): Promise<Omit<User, "password"> | null> {
    const existingClient = await this.getClientByID(id);
    if (!existingClient) {
      return null;
    }

    if (userData.role && userData.role !== UserRole.CLIENT) {
      throw new Error("No se puede cambiar el rol de cliente a un rol que no sea cliente.");
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
