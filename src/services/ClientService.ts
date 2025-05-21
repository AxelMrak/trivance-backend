
import { UserRepository } from "@repositories/UserRepository";
import { User, UserRole } from "@entities/User";

export class ClientService {
  constructor(private userRepository: UserRepository) {}

  async getClients(): Promise<User[]> {
    return this.userRepository.findAllClients();
  }

  async getClientByID(id: string): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    if (user && user.role === UserRole.CLIENT) {
      return user;
    }
    return null;
  }

  async getClientInfo(id: string): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    if (user && user.role === UserRole.CLIENT) {
      return user;
    }else {
      return null;
    }
  }

  async updateClient(id: string, userData: Partial<User>): Promise<User | null> {
    const existingClient = await this.getClientByID(id);
    if (!existingClient) {
      return null;
    }

    if (userData.role && userData.role !== UserRole.CLIENT) {
      throw new Error("Cannot change client role to a non-client role.");
    }

    return this.userRepository.update(id, userData);
  }

  async deleteClient(id: string): Promise<boolean> {
    const existingClient = await this.getClientByID(id);
    if (!existingClient) {
      return false;
    }
    await this.userRepository.delete(id);
    return true;
  }
} 

