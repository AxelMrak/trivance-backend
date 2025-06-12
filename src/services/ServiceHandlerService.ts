import { ServicesRepository } from "@/repositories/ServiceRepository";
import { Service } from "@/entities/Service";
import { ServiceRequest } from "@/entities/Request";

export class ServiceHandlerService {
  constructor(private repository: ServicesRepository) { }

  async createService(payload: ServiceRequest) {
    const companyID = process.env.COMPANY_ID || "";

    if (!companyID) {
      throw new Error("Company ID is not set");
    }

    const service = await this.repository.create({
      company_id: companyID,
      name: payload.name,
      description: payload.description,
      price: String(payload.price),
      duration: payload.duration,
    });

    if (!service) {
      throw new Error("Error creating service");
    }

    return service;
  }

  async getServiceById(id: string): Promise<Service | null> {
    const service = await this.repository.findById(id);
    if (!service) {
      throw new Error("Service not found");
    }

    return service;
  }

  async getAllCompanyServices(): Promise<Service[]> {
    const companyID = process.env.COMPANY_ID || "";
    if (!companyID) {
      throw new Error("Company ID is not set");
    }
    const services = await this.repository.findByCompanyId(companyID);
    if (!services) {
      throw new Error("No services found for this company");
    }
    return services;
  }

  async updateService(id: string, payload: ServiceRequest): Promise<Service | null> {
    const service = await this.repository.update(id, {
      name: payload.name,
      description: payload.description,
      price: String(payload.price),
      duration: payload.duration,
    });
    if (!service) {
      throw new Error("Service not found");
    }
    return service;
  }

  async deleteService(id: string): Promise<string | number | null> {
    const deletedID = await this.repository.delete(id);
    if (!deletedID) {
      throw new Error("Service not found");
    }
    return deletedID;
  }
}
