import { RequestHandler } from "express";
import { z } from "zod";

const createSchema = z.object({
  service_id: z.string().min(1, "Service ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  user_id: z.string().optional(),
  description: z.string().max(3000).optional(),
});

export const validateAppointmentCreate: RequestHandler = (req, res, next) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Validation error",
      errors: result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      })),
    });
  }
  next();
};