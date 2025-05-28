import { Router } from "express";

import { ClientController } from "@controllers/ClientController";
import { ClientService } from "@services/ClientService";
import { UserRepository } from "@repositories/UserRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";

const router = Router();

const userRepository = new UserRepository();
const clientService = new ClientService(userRepository);
const clientController = new ClientController(clientService);

router.get("/getAll", AuthMiddleware, clientController.getAllClients);
router.get("/get/:id", AuthMiddleware, clientController.getClientById);
router.put("/update/:id", AuthMiddleware, clientController.updateClient);
router.delete("/delete/:id", AuthMiddleware, clientController.deleteClient);

export default router;
