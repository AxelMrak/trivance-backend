import { Request, Response, NextFunction } from "express";

import { ServiceHandlerService } from "@/services/ServiceHandlerService";

export class ServiceController {
  constructor(private serviceHandlerService: ServiceHandlerService) {}

  createService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body;
      const service = await this.serviceHandlerService.createService(payload);
      return res.status(201).json(service);
    } catch (error) {
      next(error);
    }
  };

  getServiceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const service = await this.serviceHandlerService.getServiceById(id);
      return res.status(200).json(service);
    } catch (error) {
      next(error);
    }
  };

  getAllCompanyServices = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const services = await this.serviceHandlerService.getAllCompanyServices();
      return res.status(200).json(services);
    } catch (error) {
      next(error);
    }
  };

  updateService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const service = await this.serviceHandlerService.updateService(id, payload);
      return res.status(200).json(service);
    } catch (error) {
      next(error);
    }
  };

  deleteService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deletedID = await this.serviceHandlerService.deleteService(id);
      if (deletedID) {
        return res.status(204).send();
      }
      return res.status(404).json({ message: "Servicio no encontrado" });
    } catch (error) {
      next(error);
    }
  };
}
