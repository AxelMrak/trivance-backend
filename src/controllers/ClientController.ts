import { Request, Response } from "express";
import { ClientService } from "@services/ClientService";
import { User, PublicUserDTO } from "@entities/User";
import { convertToPublicUser } from "@/utils/user";

export class ClientController {
  constructor(private clientService: ClientService) {}

  getAll = async (_req: Request, res: Response) => {
    try {
      const clients = await this.clientService.getClients();

      const publicClients: PublicUserDTO[] = clients.map(convertToPublicUser);
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
        const publicClient: PublicUserDTO = convertToPublicUser(client);
        res.json(publicClient);
      } else {
        res.status(404).json({ message: "Client not found" });
      }
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Error fetching client", error });
    }
  };

  getClientInfo = async (req: Request, res: Response) => {
    try {
      const clientId = req.body.id;
      const client = await this.clientService.getClientInfo(clientId);

      if (client) {
        const publicClient: PublicUserDTO = convertToPublicUser(client);
        res.json(publicClient);
      } else {
        res.status(404).json({ message: "Client not found" });
      }
    } catch (error) {
      console.error("Error fetching client info:", error);
      res.status(500).json({ message: "Error fetching client info", error });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      const clientData = req.body;

      const updatedClient = await this.clientService.updateClient(clientId, clientData);

      if (updatedClient) {
        const publicClient: PublicUserDTO = convertToPublicUser(updatedClient);
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
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Client not found" });
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Error deleting client", error });
    }
  };
}
