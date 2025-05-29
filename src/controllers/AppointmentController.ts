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
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const appointment = await this.appointmentService.getById(id);
      if (appointment) {
        res.json(appointment);
      } else {
        res.status(404).json({ error: "Appointment not found" });
      }
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  updateAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updatedData = req.body;
      const updatedAppointment = await this.appointmentService.updateAppointment(id, updatedData);
      if (updatedAppointment) {
        res.json(updatedAppointment);
      } else {
        res.status(404).json({ error: "Appointment not found" });
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  deleteAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.appointmentService.deleteAppointment(id);
      if (result) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Appointment not found" });
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  createAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const appointmentData = req.body;
      const newAppointment = await this.appointmentService.createAppointment(appointmentData);
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
