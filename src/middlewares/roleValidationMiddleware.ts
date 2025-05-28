import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/entities/User';

export default function roleValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const { role } = req.body;

  if (role === undefined) {
    return res.status(400).json({ error: 'Role is required.' });
  }

  if (!Number.isInteger(role)) {
    return res.status(400).json({ error: 'Invalid role: must be an integer.' });
  }

  const validRoles = Object.values(UserRole).filter(value => typeof value === 'number') as number[];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role: must be a valid user role.' });
  }

  next();
}

