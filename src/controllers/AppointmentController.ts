import { Response, NextFunction } from "express";
import { AuthRequest } from "@/middlewares/authmiddleware";
import { AppointmentService } from "@/services/AppointmentService";

export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  getAll = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointments = await this.appointmentService.getAll();
      res.json(appointments);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const appointment = await this.appointmentService.getById(id);
      res.json(appointment);
    } catch (error) {
      next(error);
    }
  };

  updateAppointment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updatedData = req.body;
      const updatedAppointment = await this.appointmentService.updateAppointment(id, updatedData);
      if (updatedAppointment) {
        res.status(200).json(updatedAppointment);
      } else {
        res.status(404).json({ error: "Turno no encontrado" });
      }
    } catch (error) {
      next(error);
    }
  };

  deleteAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.appointmentService.deleteAppointment(id);
      if (result) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Turno no encontrado" });
      }
    } catch (error) {
      next(error);
    }
  };

  createAppointment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointmentData = req.body;
      const userId = req.user!.userId;
      const newAppointment = await this.appointmentService.createAppointment(appointmentData, userId);
      res.status(201).json(newAppointment);
    } catch (error) {
      next(error);
    }
  };

  createAppointmentPaymentLink = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const paymentLink = await this.appointmentService.createPaymentLink(id, userId);
      res.status(200).json(paymentLink);
    } catch (error) {
      next(error);
    }
  };
}
