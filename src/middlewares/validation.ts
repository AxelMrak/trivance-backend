import { RequestHandler } from "express";
import { z } from "zod";
import { AppointmentStatus } from "@/entities/EnumTypes";

export const validateUserCreate: RequestHandler = (req, res, next) => {
  const schema = z
    .object({
      name: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(8),
      confirmedPassword: z.string().min(8),
      phone: z.string().min(10),
      address: z.string().min(5),
    })
    .refine((data) => data.password === data.confirmedPassword, {
      message: "Las contraseñas no coinciden",
      path: ["Contraseña confirmada"],
    });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Error de validacion",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }
  next();
};

export const validateUserSignIn: RequestHandler = (req, res, next) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Error de validacion",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }
  next();
};

export const validateServiceCreate: RequestHandler = (req, res, next) => {
  const schema = z.object({
    name: z.string().min(3),
    description: z.string().min(5),
    price: z.number().positive(),
    duration: z.string().min(3),
    requires_deposit: z.boolean().optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Error de validacion",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }
  next();
};

export const validateAppointmentCreate: RequestHandler = (req, res, next) => {
  const createSchema = z
    .object({
      service_id: z.string().min(1, "Servicio obligatorio"),
      description: z.string().max(3000).optional(),
      // ISO 8601/RFC 3339 (permite offset -03:00 para Argentina)
      start_date: z.string().datetime(),
      client_id: z.string().uuid().optional(),
    })
    .strict();

  const result = createSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Error de validacion",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }
  next();
};

export const validateAppointmentUpdate: RequestHandler = (req, res, next) => {
  const updateSchema = z
    .object({
      description: z.string().max(3000).optional(),
      service_id: z.string().min(1).optional(),
      start_date: z.string().datetime().optional(),
      status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
    })
    .strict();

  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Error de validacion",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }

  // reassign body to parsed data to ensure stripping types
  req.body = result.data;
  next();
};

export const validateServiceUpdate: RequestHandler = (req, res, next) => {
  const updateSchema = z
    .object({
      name: z.string().min(3).optional(),
      description: z.string().min(5).optional(),
      price: z.number().positive().optional(),
      duration: z.string().min(3).optional(),
      requires_deposit: z.boolean().optional(),
    })
    .strict();

  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Error de validacion",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }
  req.body = result.data;
  next();
};

export const validateClientUpdate: RequestHandler = (req, res, next) => {
  const updateSchema = z
    .object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(10).optional(),
      address: z.string().min(5).optional(),
    })
    .strict();

  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Error de validacion",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }
  req.body = result.data;
  next();
};

export const validateClientCreate: RequestHandler = (req, res, next) => {
  const schema = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(6),
      address: z.string().min(1),
    })
    .strict();

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Error de validacion",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }
  req.body = result.data;
  next();
};
