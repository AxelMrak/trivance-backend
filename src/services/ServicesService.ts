import { ServicesRepository } from "@repositories/ServicesRepository";
import { Service } from "@/entities/Service";
import { ServiceRequest } from "@/entities/Request";

export class ServicesService {
  constructor(private repository: ServicesRepository) {}

  async createService(data: Partial<ServiceRequest>) {
    return await this.repository.create(data);
  }

  async getServiceById(id: string) {
    return await this.repository.findById(id);
  }

  async getAllServices() {
    return await this.repository.findAll();
  }

  async updateService(id: string, data: Partial<Service>) {
    return await this.repository.update(id, data);
  }

  async deleteService(id: string) {
    return await this.repository.delete(id);
  }
};