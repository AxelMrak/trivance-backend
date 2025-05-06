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
      message: "Passwords do not match",
      path: ["confirmedPassword"],
    });

  const result = schema.safeParse(req.body);
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

export const validateUserSignIn: RequestHandler = (req, res, next) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  const result = schema.safeParse(req.body);
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
