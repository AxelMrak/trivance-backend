import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/entities/User';
import { AuthRequest } from './authmiddleware';

export function requireOwnershipOrAdmin(fetchOwner: (id: string) => Promise<string>) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      const user = req.user;
      const { id } = req.params;
  
      const resourceOwnerId = await fetchOwner(id);
  
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
  
      if (user.role === UserRole.CLIENT && user.userId !== resourceOwnerId) {
        return res.status(403).json({ error: "Forbidden: not your resource" });
      }
  
      next();
    };
  }