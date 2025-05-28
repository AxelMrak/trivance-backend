import { Request, Response } from "express";
import { AppointmentService } from "@services/AppointmentService";
import { AuthRequest } from "@/middlewares/authmiddleware";
import { Appointment } from "@/entities/appointment";
import { UserRepository } from "@/repositories/UserRepository";
import { UserRole } from "@/entities/User";

export class AppointmentController {
  constructor(
    private service: AppointmentService,
    private userRepository: UserRepository
  ) {}

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const appointments =
        user.role === UserRole.CLIENT
          ? await this.service.getByUserId(user.userId)
          : await this.service.getAll();

      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getByUserId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { userId } = req.params;

      if (!user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      if (user.role === UserRole.CLIENT && user.userId !== userId) {
        res.status(403).json({ error: "Clients can only view their own appointments." });
        return;
      }

      const appointments = await this.service.getByUserId(userId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getUpcomingByUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const fromDate = new Date(); 
      const appointments = await this.service.getUpcomingByUserId(user.userId, fromDate);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      console.log("USER EN REQUEST:", user);
  
      if (!user) {
        res.status(403).json({ error: "Only authorized users can create appointments." });
        return;
      }
  
      if (![UserRole.CLIENT, UserRole.MANAGER, UserRole.STAFF, UserRole.ADMIN].includes(user.role)) {
        res.status(403).json({ error: "Only authorized users can create appointments." });
        return;
      }
  
      const { service_id, date, time, user_id: userIdFromBody } = req.body;
  
      if (!service_id || !date || !time) {
        res.status(400).json({ error: "Missing required fields." });
        return;
      }
      let userIdForAppointment =
        user.role === UserRole.CLIENT ? user.userId : userIdFromBody || user.userId;

      if (user.role !== UserRole.CLIENT) {
        const userExists = await this.userRepository.findById(userIdForAppointment);
        if (!userExists) {
          res.status(404).json({ error: "User not found." });
          return;
        }
      }
  
      const startTime = new Date(`${date}T${time}:00`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  
      const appointmentData = {
        service_id: service_id,
        user_id: userIdForAppointment,
        status: "pending",
        start_date: startTime,
        end_date: endTime,
        description: req.body.description || "",
      };
  
      console.log("Datos a crear:", appointmentData);
  
      const newAppointment = await this.service.create(appointmentData);
  
      console.log("Turno creado con éxito:", newAppointment);
  
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("ERROR EN CREACIÓN DE TURNO:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : error,
      });
    }
  }
  


  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;
      const updateData: Partial<Appointment> = req.body;

      if (!user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      if (![UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN].includes(user.role)) {
        res.status(403).json({ error: "Only staff, manager or admin can update appointments." });
        return;
      }

      const appointment = await this.service.getById(id);
      if (!appointment) {
        res.status(404).json({ error: "Appointment not found." });
        return;
      }

      const updatedAppointment: Appointment = {
        ...appointment,
        ...updateData,
        id: appointment.id,
      };

      const result = await this.service.update(id, updatedAppointment);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      if (![UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN].includes(user.role)) {
        res.status(403).json({ error: "Only staff, manager or admin can delete appointments." });
        return;
      }

      const deleted = await this.service.delete(id);
      if (!deleted) {
        res.status(404).json({ error: "Appointment not found." });
        return;
      }

      res.json({ message: "Appointment deleted." });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async cancel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const appointment = await this.service.getById(id);
      if (!appointment) {
        res.status(404).json({ error: "Appointment not found." });
        return;
      }

      if (user.role === UserRole.CLIENT && appointment.userId !== user.userId) {
        res.status(403).json({ error: "Clients can only cancel their own appointments." });
        return;
      }

      const canceledAppointment = await this.service.cancel(id);
      res.json(canceledAppointment);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async confirm(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const appointment = await this.service.getById(id);
      if (!appointment) {
        res.status(404).json({ error: "Appointment not found." });
        return;
      }

      if (user.role === UserRole.CLIENT && appointment.userId !== user.userId) {
        res.status(403).json({ error: "Clients can only confirm their own appointments." });
        return;
      }

      const confirmedAppointment = await this.service.confirm(id);
      res.json(confirmedAppointment);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
