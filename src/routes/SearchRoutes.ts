import { Router } from "express";
import { dbClient } from "@/config/db";

import AuthMiddleware from "@/middlewares/authmiddleware";
import { attachUserRole } from "@/middlewares/roleMiddleware";
import { SearchController } from "@/controllers/SearchController";
import { UserRepository } from "@/repositories/UserRepository";

const router = Router();
const userRepo = new UserRepository(dbClient);
const searchController = new SearchController(userRepo);

router.get("/global", AuthMiddleware, attachUserRole(), searchController.globalSearch);

export default router;
