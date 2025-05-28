import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/entities/User';

interface AuthRequest extends Request {
  user?: JwtPayload;
}
export type JwtPayload = {
  userId: string;
  role: UserRole;
};
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    }

    next();
  };
}