import { Router } from "express";

import { AppointmentController } from "@controllers/AppointmentController";
import { AppointmentService } from "@/services/AppointmentService";
import { AppointmentRepository } from "@/repositories/AppointmentRepository";
import AuthMiddleware from "@/middlewares/authmiddleware";
import { validateAppointmentCreate } from "@/middlewares/validateAppointmentCreate";
import { ServicesRepository } from "@/repositories/ServiceRepository";

const router = Router();
const serviceRepository = new ServicesRepository();
const appointmentRepository = new AppointmentRepository();
const appointmentService = new AppointmentService(appointmentRepository, serviceRepository);
const appointmentController = new AppointmentController(appointmentService);
router.post(
  "/create",
  [validateAppointmentCreate, AuthMiddleware],
  appointmentController.createAppointment,
);
router.get("/getAll", AuthMiddleware, appointmentController.getAll);
router.get("/get/:id", AuthMiddleware, appointmentController.getById);
router.put("/update/:id", AuthMiddleware, appointmentController.updateAppointment);
router.delete("/delete/:id", AuthMiddleware, appointmentController.deleteAppointment);

export default router;

