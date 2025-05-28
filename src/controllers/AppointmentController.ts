import { Request, Response } from "express";
import { AppointmentService } from "@services/AppointmentService";
import { JwtPayload } from "@/middlewares/authmiddleware";
import { Appointment } from "@/entities/appointment";

export class AppointmentController {
  constructor(private service: AppointmentService) {}

  async getAll(req: Request, res: Response): Promise<void> {
    const appointments = await this.service.getAll();
    res.json(appointments);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const appointment = await this.service.getById(id);
    res.json(appointment);
  }

  async create(req: Request, res: Response): Promise<void> {
    const appointmentData: Appointment = req.body;
    const newAppointment = await this.service.create(appointmentData);
    res.status(201).json(newAppointment);
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const updatedData: Appointment = req.body;
    const updatedAppointment = await this.service.update(id, updatedData);
    res.json(updatedAppointment);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await this.service.delete(id);
    res.json(result);
  }

  async getByUserId(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const appointments = await this.service.getByUserId(userId);
    res.json(appointments);
  }

  async getByServiceId(req: Request, res: Response): Promise<void> {
    const { serviceId } = req.params;
    const appointments = await this.service.getByServiceId(serviceId);
    res.json(appointments);
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const canceledAppointment = await this.service.cancel(id);
    res.json(canceledAppointment);
  }

  async confirm(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const confirmedAppointment = await this.service.confirm(id);
    res.json(confirmedAppointment);
  }
}