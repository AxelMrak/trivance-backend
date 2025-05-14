import { ServiceHandlerService } from "@/services/ServiceHandlerService";
import { Request, Response } from "express";

export class ServiceController {
  constructor(private serviceHandlerService: ServiceHandlerService) {}

  createService = async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const service = await this.serviceHandlerService.createService(payload);
      console.log("Service created successfully", service);
      return res.status(201).json(service);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error creating service", error);
        return res.status(400).json({ message: error.message });
      }
    }
  };

  getServiceById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const service = await this.serviceHandlerService.getServiceById(id);
      return res.status(200).json(service);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  };

  getAllCompanyServices = async (res: Response) => {
    try {
      const services = await this.serviceHandlerService.getAllCompanyServices();
      return res.status(200).json(services);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  };

  updateService = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const service = await this.serviceHandlerService.updateService(id, payload);
      return res.status(206).json(service);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  };

  deleteService = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedID = await this.serviceHandlerService.deleteService(id);
      return res.status(200).json({ message: "Service deleted successfully", id: deletedID });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
    }
  };
}
