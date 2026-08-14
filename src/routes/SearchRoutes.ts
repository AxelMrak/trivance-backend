import { Router } from "express";

import { dbClient } from "@/config/db";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { attachUserRole } from "@/middlewares/roleMiddleware";
import { SearchController } from "@/controllers/SearchController";
import { UserRepository } from "@/repositories/UserRepository";
import { ServiceRepository } from "@/repositories/ServiceRepository";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import { ClientsRepository } from "@/repositories/ClientsRepository";

const router = Router();
const userRepo = new UserRepository(dbClient);
const searchController = new SearchController(
  userRepo,
  new ServiceRepository(dbClient),
  new AppointmentRepository(dbClient),
  new ClientsRepository(),
);

router.get("/global", AuthMiddleware, attachUserRole(), searchController.globalSearch);

export default router;
