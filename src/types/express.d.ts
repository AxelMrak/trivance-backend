import { JwtPayload } from "@/middlewares/authmiddleware";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}