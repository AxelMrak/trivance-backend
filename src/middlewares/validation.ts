import { RequestHandler } from "express";
import { z } from "zod";

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
  const createSchema = z.object({
    service_id: z.string().min(1, "Servicio obligatorio"),
    user_id: z.string().optional(),
    description: z.string().max(3000).optional(),
    start_date: z.string().min(1, "Fecha y hora obligatoria"),
  });

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
