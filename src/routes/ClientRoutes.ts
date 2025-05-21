
import { Router } from "express";
import { ClientController } from "@controllers/ClientController";
import { ClientService } from "@services/ClientService";
import { UserRepository } from "@repositories/UserRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";

const router = Router();

const userRepository = new UserRepository();
const clientService = new ClientService(userRepository);
const clientController = new ClientController(clientService);

router.get("/get-all", AuthMiddleware, clientController.getAll);
router.get("/get-by-id/:id", AuthMiddleware, clientController.getById);
router.post("/getClient", AuthMiddleware, clientController.getClientInfo);
router.put("/update/:id", AuthMiddleware, clientController.update);
router.delete("/delete/:id", AuthMiddleware, clientController.delete);

export default router;
