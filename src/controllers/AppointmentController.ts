import { Response } from "express";

import { AuthRequest } from "@/middlewares/authmiddleware";
import { AppointmentService } from "@/services/AppointmentService";

export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  getAll = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const appointments = await this.appointmentService.getAll();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Error de servidor.Contacte a soporte" });
    }
  };

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const appointment = await this.appointmentService.getById(id);
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Error de servidor.Contacte a soporte" });
    }
  };

  updateAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updatedData = req.body;
      const updatedAppointment = await this.appointmentService.updateAppointment(id, updatedData);
      if (updatedAppointment) {
        res.status(206).json(updatedAppointment);
      } else {
        res.status(404).json({ error: "Turno no encontrado" });
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Error de servidor.Contacte a soporte" });
    }
  };

  deleteAppointment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.appointmentService.deleteAppointment(id);
      if (result) {
        res.status(204).send({ message: "Turno eliminado con exito", id: result });
      } else {
        res.status(404).json({ error: "Turno no encontrado" });
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ error: "Error de servidor.Contacte a soporte" });
    }
  };

  createAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const appointmentData = req.body;
      const newAppointment = await this.appointmentService.createAppointment(appointmentData);
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Error al crear turno:", error);
      res.status(500).json({ error: "Error de servidor.Contacte a soporte" });
    }
  };

  createAppointmentPaymentLink = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const paymentLink = await this.appointmentService.createPaymentLink(id);
      res.status(201).json({ paymentLink });
    } catch (error) {
      console.error("Error al crear Link de pago:", error);
      res.status(500).json({ error: "Error de servidor.Contacte a soporte" });
    }
  };
}
