import { Response } from "express";
import { AppError } from "@/errors/httpErrors";
import { AuthRequest } from "@/middlewares/authmiddleware";
import { AppointmentService } from "@/services/AppointmentService";

export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  getAll = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const appointments = await this.appointmentService.getAll();
      res.json(appointments);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error de servidor.Contacte a soporte" });
      }
    }
  };

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const appointment = await this.appointmentService.getById(id);
      res.json(appointment);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error de servidor.Contacte a soporte" });
      }
    }
  };

  updateAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
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
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error de servidor.Contacte a soporte" });
      }
    }
  };

  deleteAppointment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.appointmentService.deleteAppointment(id);
      if (result) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Turno no encontrado" });
      }
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error de servidor.Contacte a soporte" });
      }
    }
  };

  createAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const appointmentData = req.body;
      const userId = req.user!.userId;
      const newAppointment = await this.appointmentService.createAppointment(appointmentData, userId);
      res.status(201).json(newAppointment);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error de servidor.Contacte a soporte" });
      }
    }
  };

  createAppointmentPaymentLink = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const paymentLink = await this.appointmentService.createPaymentLink(id, userId);
      res.status(200).json(paymentLink);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error de servidor.Contacte a soporte" });
      }
    }
  };
}
