import { Request, Response, NextFunction } from "express";

import { ClientService } from "@services/ClientService";
import { UserRepository } from "@/repositories/UserRepository";

export class ClientController {
  constructor(
    private clientService: ClientService,
    private userRepository: UserRepository,
  ) {}

  getAllClients = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const clients = await this.clientService.getAllClients();
      res.json(clients);
    } catch (error) {
      next(error as any);
    }
  };

  getClientById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = req.params.id;
      const client = await this.clientService.getClientByID(clientId);

      if (client) {
        res.json(client);
      } else {
        res.status(404).json({ message: "Cliente no encontrado" });
      }
    } catch (error) {
      next(error as any);
    }
  };

  updateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = req.params.id;
      const clientData = req.body;
      const updatedClient = await this.clientService.updateClient(clientId, clientData);

      if (updatedClient) {
        res.json(updatedClient);
      } else {
        res.status(404).json({ message: "Cliente no encontrado" });
      }
    } catch (error) {
      next(error as any);
    }
  };

  deleteClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = req.params.id;
      const success = await this.clientService.deleteClient(clientId);

      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Cliente no encontrado" });
      }
    } catch (error) {
      next(error as any);
    }
  };

  createClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId as string | undefined;
      const user = userId ? await this.userRepository.findById(userId) : null;
      const created = await this.clientService.createClient(
        req.body,
        (user as any)?.company_id ?? null,
      );
      res.status(201).json(created);
    } catch (error) {
      next(error as any);
    }
  };
}
