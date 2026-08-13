import { Router } from "express";
import { dbClient } from "@/config/db";

import { ClientController } from "@controllers/ClientController";
import { ClientService } from "@services/ClientService";
import { ClientsRepository } from "@/repositories/ClientsRepository";
import { UserRepository } from "@/repositories/UserRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { attachUserRole, requireMinRole } from "@/middlewares/roleMiddleware";
import { validateClientCreate, validateClientUpdate } from "@/middlewares/validation";

const router = Router();

const clientsRepository = new ClientsRepository();
const clientService = new ClientService(clientsRepository);
const clientController = new ClientController(clientService, new UserRepository(dbClient));

router.get(
  "/getAll",
  AuthMiddleware,
  attachUserRole(),
  requireMinRole(2),
  clientController.getAllClients,
);
router.get(
  "/get/:id",
  AuthMiddleware,
  attachUserRole(),
  requireMinRole(2),
  clientController.getClientById,
);
router.put(
  "/update/:id",
  AuthMiddleware,
  attachUserRole(),
  requireMinRole(2),
  validateClientUpdate,
  clientController.updateClient,
);
router.delete(
  "/delete/:id",
  AuthMiddleware,
  attachUserRole(),
  requireMinRole(2),
  clientController.deleteClient,
);

router.post(
  "/create",
  AuthMiddleware,
  attachUserRole(),
  requireMinRole(2),
  validateClientCreate,
  clientController.createClient,
);

export default router;
