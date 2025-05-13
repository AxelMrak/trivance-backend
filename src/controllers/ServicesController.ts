import {Request, Response} from "express";
import { Service } from "@/entities/Service";
import { ServicesRepository } from "@/repositories/ServicesRepository";
import { ServicesService } from "@/services/ServicesService";
 
const servicesRepository = new ServicesRepository();
const serviceUseCase = new ServicesService(servicesRepository);

export class ServiceController{
  constructor(private ServicesService: ServicesService){}

    servicecreate = async (req: Request, res: Response) => {
    try {
      const result = await serviceUseCase.createService(req.body);
      return res.status(201).json(result);
    } catch (err) {
      console.error("Error creating service:", err);
      return res.status(500).json({ error: "Failed to create service" });
    }
  };

  getServiceById = async (req: Request, res: Response) => {
    try {
      const service = await serviceUseCase.getServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      return res.status(200).json(service);
    } catch (err) {
      console.error("Error getting service by ID:", err);
      return res.status(500).json({ error: "Failed to get service" });
    }
  };

  getAllServices = async (_req: Request, res: Response) => {
    try {
      const services = await serviceUseCase.getAllServices();
      return res.status(200).json(services);
    } catch (err) {
      console.error("Error getting all services:", err);
      return res.status(500).json({ error: "Failed to fetch services" });
    }
  };

  updateService = async (req: Request, res: Response) => {
    try {
      const result = await serviceUseCase.updateService(req.params.id, req.body);
      if (!result) {
        return res.status(404).json({ error: "Service not found" });
      }
      return res.status(200).json(result);
    } catch (err) {
      console.error("Error updating service:", err);
      return res.status(500).json({ error: "Failed to update service" });
    }
  };

  deleteService = async (req: Request, res: Response) => {
    try {
      const deletedId = await serviceUseCase.deleteService(req.params.id);
      if (!deletedId) {
        return res.status(404).json({ error: "Service not found" });
      }
      return res.status(200).json({ id: deletedId });
    } catch (err) {
      console.error("Error deleting service:", err);
      return res.status(500).json({ error: "Failed to delete service" });
    }
  };
}