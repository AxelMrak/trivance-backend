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
//TODO: Why is this returning password on the response? BLACK GUY or #000000 guy FIX THIS NOW!!!!!!!!!!!!!! :)
router.put("/update/:id", AuthMiddleware, clientController.updateClient);
router.delete("/delete/:id", AuthMiddleware, clientController.deleteClient);

export default router;
