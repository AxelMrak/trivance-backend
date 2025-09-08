import { Router } from "express";
import { ClientController } from "@controllers/ClientController";
import { ClientService } from "@services/ClientService";
import { UserRepository } from "@repositories/UserRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { validateClientUpdate } from "@/middlewares/validation";

const router = Router();

const userRepository = new UserRepository();
const clientService = new ClientService(userRepository);
const clientController = new ClientController(clientService);

router.get("/getAll", AuthMiddleware, clientController.getAllClients);
router.get("/get/:id", AuthMiddleware, clientController.getClientById);
router.put("/update/:id", AuthMiddleware, validateClientUpdate, clientController.updateClient);
router.delete("/delete/:id", AuthMiddleware, clientController.deleteClient);

export default router;
