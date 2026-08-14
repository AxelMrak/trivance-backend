import { Router } from "express";

import { dbClient } from "@/config/db";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { attachUserRole } from "@/middlewares/roleMiddleware";
import { StatsController } from "@/controllers/StatsController";
import { StatsService } from "@/services/StatsService";
import { StatsRepository } from "@/repositories/StatsRepository";
import { UserRepository } from "@/repositories/UserRepository";
import { ServiceRepository } from "@/repositories/ServiceRepository";
import { ServiceHandlerService } from "@/services/ServiceHandlerService";

const router = Router();

const statsRepository = new StatsRepository();
const userRepository = new UserRepository(dbClient);
const serviceRepository = new ServiceRepository(dbClient);
const serviceHandlerService = new ServiceHandlerService(serviceRepository);
const statsService = new StatsService(statsRepository, userRepository, serviceHandlerService);
const statsController = new StatsController(statsService);

router.get(
  "/appointments/summary",
  AuthMiddleware,
  attachUserRole(),
  statsController.getAppointmentSummary,
);
router.get(
  "/appointments/most-used-service",
  AuthMiddleware,
  attachUserRole(),
  statsController.getMostUsedService,
);

export default router;
