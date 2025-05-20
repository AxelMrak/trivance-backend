// src/controllers/ClientController.ts
import { Request, Response } from "express";
import { ClientService } from "@services/ClientService";
import { User, PublicUserDTO } from "@entities/User";

export class ClientController {
  constructor(private clientService: ClientService) {}

  getAll = async (_req: Request, res: Response) => {
    try {
      const clients = await this.clientService.getClients();
      // Convertir a PublicUserDTO (opcional)
      const publicClients: PublicUserDTO[] = clients.map(this.convertToPublicClient);
      res.json(publicClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Error fetching clients", error });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      const client = await this.clientService.getClientByID(clientId);

      if (client) {
        // Convertir a PublicUserDTO (opcional)
        const publicClient: PublicUserDTO = this.convertToPublicClient(client);
        res.json(publicClient);
      } else {
        res.status(404).json({ message: "Client not found" });
      }
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Error fetching client", error });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const clientData = req.body;
      const newClient = await this.clientService.createClient(clientData);

      // Convertir a PublicUserDTO (opcional)
      const publicClient: PublicUserDTO = this.convertToPublicClient(newClient);
      res.status(201).json(publicClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Error creating client", error });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      const clientData = req.body;

      const updatedClient = await this.clientService.updateClient(clientId, clientData);

      if (updatedClient) {
        // Convertir a PublicUserDTO (opcional)
        const publicClient: PublicUserDTO = this.convertToPublicClient(updatedClient);
        res.json(publicClient);
      } else {
        res.status(404).json({ message: "Client not found" });
      }
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Error updating client", error });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      const success = await this.clientService.deleteClient(clientId);

      if (success) {
        res.status(204).send(); // No Content
      } else {
        res.status(404).json({ message: "Client not found" });
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Error deleting client", error });
    }
  };

  private convertToPublicClient(user: User): PublicUserDTO {
    return {
      id: user.id,
      company_id: user.company_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
