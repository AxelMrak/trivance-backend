import { Router } from "express";
import { ClientController } from "@controllers/ClientController";
import { ClientService } from "@services/ClientService";
import { ClientRepository } from "@repositories/ClientRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { attachUserRole, requireMinRole } from "@/middlewares/roleMiddleware";
import { validateClientUpdate } from "@/middlewares/validation";

const router = Router();

const userRepository = new ClientRepository();
const clientService = new ClientService(userRepository);
const clientController = new ClientController(clientService);

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

export default router;
