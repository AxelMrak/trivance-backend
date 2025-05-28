import { Router } from "express";
import { AppointmentController } from "@controllers/AppointmentController";
import { AppointmentService } from "@/services/AppointmentService";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { requireRole } from "@/middlewares/requireRole";
import { requireOwnershipOrAdmin } from "@/middlewares/requireOwnershipOrAdmin";
import validateUserRole from "@/middlewares/validateUserRoleInBody";
import { UserRepository } from "@/repositories/UserRepository";
import { UserRole } from "@/entities/User";
import { validateAppointmentCreate } from "@/middlewares/validateAppointmentCreate";

const router = Router();
const userRepository = new UserRepository();    
const appointmentRepository = new AppointmentRepository();
const appointmentService = new AppointmentService(appointmentRepository);
const appointmentController = new AppointmentController(appointmentService,userRepository);

const fetchOwnerByAppointmentId = async (id: string): Promise<string> => {
    const appointment = await appointmentService.getById(id);
    return appointment?.userId ?? "";
};

router.get("/getAll", AuthMiddleware, appointmentController.getAll);
router.get("/getUpcoming", AuthMiddleware, appointmentController.getUpcomingByUser);
router.get("/getByUser/:userId",AuthMiddleware,requireOwnershipOrAdmin(async (userId: string) => userId),appointmentController.getByUserId);
  router.post("/create",AuthMiddleware,[validateUserRole,validateAppointmentCreate],appointmentController.create.bind(appointmentController));

router.put("/update/:id", [AuthMiddleware, requireRole([UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN])], appointmentController.update);

router.delete("/delete/:id", [AuthMiddleware, requireRole([UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN])], appointmentController.delete);

router.patch("/cancel/:id",AuthMiddleware,requireOwnershipOrAdmin(fetchOwnerByAppointmentId),
appointmentController.cancel);

router.patch("/confirm/:id",AuthMiddleware,requireOwnershipOrAdmin(fetchOwnerByAppointmentId), appointmentController.confirm);

export default router;