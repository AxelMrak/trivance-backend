import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { Request, Response } from "express";

export class ServiceController {
  constructor(private ServiceHandlerService: ServiceHandlerService) {}

  async createService(req: Request, res: Response) {
    try {
      const payload = req.body;
      const service = await this.ServiceHandlerService.createService(payload);
      return res.status(201).json(service);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  }

  async getServiceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const service = await this.ServiceHandlerService.getServiceById(id);
      return res.status(200).json(service);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  }

  async getAllCompanyServices(res: Response) {
    try {
      const services = await this.ServiceHandlerService.getAllCompanyServices();
      return res.status(200).json(services);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  }

  async updateService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const service = await this.ServiceHandlerService.updateService(id, payload);
      return res.status(206).json(service);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  }

  async deleteService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedID = await this.ServiceHandlerService.deleteService(id);
      return res.status(200).json({ message: "Service deleted successfully", id: deletedID });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  }
}
