import { RequestHandler } from "express";
import { z } from "zod";

export const validateUserCreate: RequestHandler = (req, res, next) => {
  const schema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }
  next();
};
